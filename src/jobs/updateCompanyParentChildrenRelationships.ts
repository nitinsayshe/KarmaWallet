import fs from 'fs';
import os from 'os';
import path from 'path';
import axios from 'axios';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import csvtojson from 'csvtojson';
import { CompanyModel, ICompanyDocument } from '../models/company';
import { IJobReportDocument, JobReportModel, JobReportStatus } from '../models/jobReport';
import { IUpdateJobReportData, updateJobReport } from '../services/jobReport/utils';

dayjs.extend(utc);

interface ICreateBatchCompaniesData {
  fileUrl: string;
  jobReportId: string;
}

interface IRawCompany {
  companyId: string;
  companyName: string;
  parentId: string;
  removeParent: string;
  notes: string;
}

interface IAltCompany {
  companyName: string;
  companyId: string;
}

interface IConfig {
  jobReportId: string;
  jobReport: IJobReportDocument;
  rawData: IRawCompany[];
  companies: ICompanyDocument[];
  altEnvCompanies: IAltCompany[];
}

const requiredFields: (keyof IRawCompany)[] = [
  'companyId',
  'companyName',
];

const allowedFields: (keyof IRawCompany)[] = [
  ...requiredFields,
  'parentId',
  'removeParent',
  'notes',
];

const getExistingData = async (jobReportId: string): Promise<[ICompanyDocument[], IJobReportDocument, IAltCompany[]]> => {
  console.log('\nretrieving existing data from database...');
  const altEnvCompaniesFilePath = path.resolve(os.homedir(), 'Desktop', 'alt-companies.json');
  let companies: ICompanyDocument[] = [];
  let jobReport: IJobReportDocument;
  let altEnvCompanies: IAltCompany[] = [];

  try {
    companies = await CompanyModel.find({});
    jobReport = await JobReportModel
      .findById(jobReportId)
      .populate({ path: 'prevJobReports', model: JobReportModel });

    if (process.env.KARMA_ENV === 'development' && fs.existsSync(altEnvCompaniesFilePath)) {
      altEnvCompanies = JSON.parse(fs.readFileSync(altEnvCompaniesFilePath, 'utf8'));
    }
  } catch (err) {
    console.log('[-] error retrieving companies');
    console.log(err);
  }

  if (!companies.length || !jobReport || (process.env.KARMA_ENV === 'development' && !altEnvCompanies.length)) {
    const message = process.env.KARMA_ENV === 'development'
      ? 'Failed to retrieve companies, job report, and/or alt env companies from database.'
      : 'Failed to retrieve companies and/or job report from database.';

    await updateJobReport(
      jobReportId,
      JobReportStatus.Failed,
      {
        message,
        status: JobReportStatus.Failed,
      },
    );
  } else {
    console.log('[+] existing data retrieved');
  }

  return [companies, jobReport, altEnvCompanies];
};

const loadRawData = async (fileUrl: string, jobReportId: string) => {
  console.log('\nretrieving raw data from file...');
  let rawData: IRawCompany[] = [];

  try {
    const res = await axios.get(fileUrl);
    rawData = await csvtojson().fromString(res.data);
  } catch (err) {
    console.log('[-] error retrieving batch company data from S3');
    console.log(err);
  }

  if (!rawData?.length) {
    await updateJobReport(
      jobReportId,
      JobReportStatus.Failed,
      {
        message: 'Failed to retrieve batch company data from S3.',
        status: JobReportStatus.Failed,
      },
    );
    return;
  }

  console.log('[+] raw data loaded');
  return rawData;
};

const validateRawData = async ({ jobReportId, rawData, companies, altEnvCompanies }: IConfig) => {
  console.log('\nvalidating raw data...');

  const errors: IUpdateJobReportData[] = [];

  // verify allowed fields
  const invalidFields = Object.keys(rawData[0]).filter(key => !allowedFields.includes(key as keyof IRawCompany));
  if (invalidFields.length) {
    const message = `Invalid fields in batch company parent/child relationships data found: ${invalidFields.join(', ')}`;
    console.log(`[-] ${message}`);
    errors.push({ message, status: JobReportStatus.Failed });
  }

  for (let i = 0; i < rawData.length; i++) {
    // verify all required keys are included
    const missingRequiredFields = requiredFields.filter(key => !(key in rawData[i]));
    if (missingRequiredFields.length) {
      const message = `Row ${i + 1} is missing required fields: ${missingRequiredFields.join(', ')}`;
      console.log(`[-] ${message}`);
      errors.push({ message, status: JobReportStatus.Failed });
    }

    const { companyName, companyId, parentId, removeParent } = rawData[i];

    if (!parentId && !removeParent) {
      const message = `Row ${i + 1} has no parent or remove parent`;
      console.log(`[-] ${message}`);
      errors.push({ message, status: JobReportStatus.Failed });
    }

    if (!!companyId && !!parentId && companyId === parentId) {
      const message = `Row ${i + 1} has the same companyId and parentId`;
      console.log(`[-] ${message}`);
      errors.push({ message, status: JobReportStatus.Failed });
    }

    let childCompanyFound = false;
    let parentCompanyFound = false;

    for (const company of companies) {
      let _companyId: string;

      if (!!altEnvCompanies.length) {
        for (const altCompany of altEnvCompanies) {
          if (altCompany.companyName === company.companyName) {
            _companyId = altCompany.companyId;
            break;
          }
        }
      } else {
        _companyId = company._id.toString();
      }

      if (!!companyId && _companyId === companyId) {
        childCompanyFound = true;
      }

      if (!!parentId && _companyId === parentId) {
        parentCompanyFound = true;
      }

      if (childCompanyFound && parentCompanyFound) {
        break;
      }
    }

    if (!childCompanyFound) {
      const message = `Row ${i + 1} has an invalid companyId - ${companyId} - ${companyName}`;
      console.log(`[-] ${message}`);
      errors.push({ message, status: JobReportStatus.Failed });
    }

    if (!!parentId && !parentCompanyFound) {
      const message = `Row ${i + 1} has an invalid parentId - ${parentId}`;
      console.log(`[-] ${message}`);
      errors.push({ message, status: JobReportStatus.Failed });
    }
  }

  if (!!errors.length) {
    await updateJobReport(jobReportId, JobReportStatus.Failed, errors);
    console.log('[-] raw data failed validated');
    return;
  }

  console.log('[+] raw data validated');
  return true;
};

const updateCompanyParentChildRelationships = async ({ jobReportId, rawData, companies, altEnvCompanies }: IConfig) => {
  console.log('\nupdating company parent/child relationships...');

  const errors: IUpdateJobReportData[] = [];
  let count = 0;

  for (const row of rawData) {
    const { companyId, parentId, removeParent, notes } = row;

    let childCompany: ICompanyDocument;
    let parentCompany: ICompanyDocument;

    for (const company of companies) {
      let _companyId: string;

      if (!!altEnvCompanies.length) {
        for (const altCompany of altEnvCompanies) {
          if (altCompany.companyName === company.companyName) {
            _companyId = altCompany.companyId;
            break;
          }
        }
      } else {
        _companyId = company._id.toString();
      }

      if (!!companyId && _companyId === companyId) {
        childCompany = company;
      }

      if (!!parentId && _companyId === parentId) {
        parentCompany = company;
      }

      if (!!parentCompany && !!childCompany) {
        break;
      }
    }

    if (!childCompany || (!!parentId && !parentCompany)) {
      console.log('[-] failed to find required companies for row: ', row);
      continue;
    }

    if (removeParent.toLowerCase() === 'true') {
      childCompany.parentCompany = null;
    } else {
      childCompany.parentCompany = parentCompany;
    }

    if (!!notes) {
      childCompany.notes = `${childCompany.notes ? `${childCompany.notes} \n` : ''}${notes}`;
    }

    try {
      await childCompany.save();
      count += 1;
    } catch (err: any) {
      console.log(`[-] error updating company ${companyId}`);
      console.log(err);
      errors.push({
        message: `Error updating company ${companyId} - ${err.message}`,
        status: JobReportStatus.Failed,
      });
    }
  }

  let finalMessage: string;
  let finalMessageStatus: JobReportStatus;

  if (!!errors.length) {
    if (count === 0) {
      finalMessage = 'failed to update company parent/child relationships';
      finalMessageStatus = JobReportStatus.Failed;
    } else {
      finalMessage = `parent/child relationships updated for ${count}/${rawData.length} companies but with ${errors.length} errors.`;
      finalMessageStatus = JobReportStatus.CompletedWithErrors;
    }
  } else {
    if (count === 0) {
      finalMessage = 'something strange has happened...';
      finalMessageStatus = JobReportStatus.Unknown;
    } else {
      finalMessage = `parent/child relationships updated for ${count}/${rawData.length} companies.`;
      finalMessageStatus = JobReportStatus.Completed;
    }
  }

  console.log(`[${finalMessageStatus === JobReportStatus.Failed ? '-' : finalMessageStatus === JobReportStatus.Unknown ? '!' : '+'}] ${finalMessage}`);

  await updateJobReport(
    jobReportId,
    finalMessageStatus,
    [
      ...errors,
      {
        message: finalMessage,
        status: finalMessageStatus,
      },
    ],
  );

  return { message: finalMessage, status: finalMessageStatus };
};

export const exec = async ({ fileUrl, jobReportId }: ICreateBatchCompaniesData) => {
  console.log('\nupdating companies parent/child relationships...\n');

  await updateJobReport(jobReportId, JobReportStatus.Processing);

  const [companies, jobReport, altEnvCompanies] = await getExistingData(jobReportId);
  if (!companies?.length || !jobReport) return;

  const rawData = await loadRawData(fileUrl, jobReportId);
  if (!rawData?.length) return;

  const config = { jobReportId, jobReport, rawData, companies, altEnvCompanies };

  const isValidRawData = await validateRawData(config);
  if (!isValidRawData) return;

  const result = await updateCompanyParentChildRelationships(config);

  // if a prevJobReportId is present, it means that this parent/child relationship
  // mapping is an optional step in another flow (like creating new companies), so
  // we need to update the previous job report...otherwise, we need to recalculate
  // all company scores, and any scores, totals, or averages that are dependent on
  // them.
  if (!!jobReport.prevJobReports?.length) {
    for (const prevJobReport of jobReport.prevJobReports) {
      await updateJobReport(
        (prevJobReport as IJobReportDocument)._id.toString(),
        null,
        {
          message: `${result.message} - (see job report: ${jobReportId})`,
          status: result.status,
        },
      );
    }
  } else {
    console.log('>>>>> calculating new company scores...');
  }
};
