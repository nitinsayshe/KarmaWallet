import fs from 'fs';
import os from 'os';
import path from 'path';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import axios from 'axios';
import csvtojson from 'csvtojson';
import { IJobReportDocument, JobReportModel, JobReportStatus } from '../models/jobReport';
import { IUpdateJobReportData, updateJobReport } from '../services/jobReport/utils';
import { DataSourceModel, IDataSourceDocument } from '../models/dataSource';
import { CompanyCreationStatus, CompanyHideReasons, CompanyModel, ICompanyDocument } from '../models/company';
import { CompanyDataSourceModel, ICompanyDataSourceDocument } from '../models/companyDataSource';

dayjs.extend(utc);

interface IUpdateBatchCompaniesToDataSourceData {
  fileUrl: string;
  jobReportId: string;
}

interface IRawData {
  companyName: string;
  companyId: string;
  dataSourceId: string;
  dataSourceName: string;
  action: string;
  expiration: string;
  value: string;
  isPrimary: string;
  primaryReplacementDataSourceId: string;
}

interface IAltCompany {
  companyName: string;
  companyId: string;
}

interface IAltDataSource {
  dataSourceName: string;
  dataSourceId: string;
}

interface IConfig {
  jobReportId: string;
  jobReport: IJobReportDocument;
  rawData: IRawData[];
  companies: ICompanyDocument[];
  dataSources: IDataSourceDocument[];
  altEnvCompanies: IAltCompany[];
  altEnvDataSources: IAltDataSource[];
}

const requiredFields: (keyof IRawData)[] = [
  'companyId',
  'dataSourceId',
  'action',
];

export const getExistingData = async (jobReportId: string): Promise<[ICompanyDocument[], IDataSourceDocument[], IJobReportDocument, IAltCompany[], IAltDataSource[]]> => {
  console.log('\nretrieving existing data from database...');
  const altEnvCompaniesFilePath = path.resolve(os.homedir(), 'Desktop', 'alt-companies.json');
  const altEnvDataSourcesFilePath = path.resolve(os.homedir(), 'Desktop', 'alt-data-sources.json');
  let companies: ICompanyDocument[] = [];
  let dataSources: IDataSourceDocument[] = [];
  let jobReport: IJobReportDocument;
  let altEnvCompanies: IAltCompany[] = [];
  let altEnvDataSources: IAltDataSource[] = [];

  try {
    companies = await CompanyModel.find({});
    dataSources = await DataSourceModel.find({});
    jobReport = await JobReportModel
      .findById(jobReportId)
      .populate({ path: 'prevJobReports', model: JobReportModel });

    if (process.env.KARMA_ENV === 'development' && fs.existsSync(altEnvCompaniesFilePath)) {
      altEnvCompanies = JSON.parse(fs.readFileSync(altEnvCompaniesFilePath, 'utf8'));
      altEnvDataSources = JSON.parse(fs.readFileSync(altEnvDataSourcesFilePath, 'utf8'));
    }
  } catch (err) {
    console.log('[-] error retrieving companies');
    console.log(err);
  }

  if (!companies.length || !dataSources || !jobReport || (process.env.KARMA_ENV === 'development' && (!altEnvCompanies.length || !altEnvDataSources.length))) {
    const message = process.env.KARMA_ENV === 'development'
      ? 'Failed to retrieve companies, data sources, job report, alt env companies, and/or alt env data sources from database.'
      : 'Failed to retrieve companies data sources, and/or job report from database.';

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

  return [companies, dataSources, jobReport, altEnvCompanies, altEnvDataSources];
};

const loadRawData = async (fileUrl: string, jobReportId: string) => {
  console.log('\nretrieving raw data from file...');
  let rawData: IRawData[] = [];

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
        message: 'Failed to retrieve batch company to data source mapping data from S3.',
        status: JobReportStatus.Failed,
      },
    );
    return;
  }

  console.log('[+] raw data loaded');
  return rawData;
};

const validateRawData = async ({ jobReportId, rawData, companies, dataSources, altEnvCompanies, altEnvDataSources }: IConfig) => {
  console.log('\nvalidating raw data...');

  const errors: IUpdateJobReportData[] = [];

  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i];

    // validate all required fields
    const missingFields = requiredFields.filter(key => !row[key]);

    if (missingFields.length) {
      const message = `Row: ${i + 1} is missing required fields: ${missingFields.join(', ')}`;
      console.log(`[-] ${message}`);
      errors.push({ message, status: JobReportStatus.Failed });
    }

    // validate that all company ids are valid
    let company: ICompanyDocument;

    if (altEnvCompanies.length) {
      const companyName = altEnvCompanies.find(c => c.companyId === row.companyId)?.companyName;
      if (!!companyName) company = companies.find(c => c.companyName === companyName);
    } else {
      company = companies.find(c => c._id.toString() === row.companyId);
    }

    if (!company) {
      const message = `Row: ${i + 1} contains an invalid company id: ${row.companyId}`;
      console.log(`[-] ${message}`);
      errors.push({ message, status: JobReportStatus.Failed });
    }

    // validate that all data source ids are valid
    let dataSource: IDataSourceDocument;

    if (altEnvDataSources.length) {
      const dataSourceName = altEnvDataSources.find(d => d.dataSourceId === row.dataSourceId)?.dataSourceName;
      if (!!dataSourceName) dataSource = dataSources.find(d => d.name === dataSourceName);
    } else {
      dataSource = dataSources.find(d => d._id.toString() === row.dataSourceId);
    }

    if (!dataSource) {
      const message = `Row: ${i + 1} contains an invalid data source id: ${row.dataSourceId}`;
      console.log(`[-] ${message}`);
      errors.push({ message, status: JobReportStatus.Failed });
    }

    // validate that all actions are supported (ADD, REMOVE)
    if (row.action.toLowerCase() !== 'add' && row.action.toLowerCase() !== 'remove' && row.action.toLowerCase() !== 'update') {
      const message = `Row: ${i + 1} contains an invalid action: ${row.action}`;
      console.log(`[-] ${message}`);
      errors.push({ message, status: JobReportStatus.Failed });
    }

    // verify that all ADD actions also provide an expiration and a value
    if (row.action.toLowerCase() === 'add') {
      if (!row.expiration) {
        const message = `Row: ${i + 1} is missing expiration date`;
        console.log(`[-] ${message}`);
        errors.push({ message, status: JobReportStatus.Failed });
      }

      if (!row.value) {
        const message = `Row: ${i + 1} is missing a value`;
        console.log(`[-] ${message}`);
        errors.push({ message, status: JobReportStatus.Failed });
      }

      if (!!row.isPrimary && row.isPrimary.toLowerCase() !== 'true' && row.isPrimary.toLowerCase() !== 'false') {
        const message = `Row: ${i + 1} contains an invalid isPrimary value: ${row.isPrimary}`;
        console.log(`[-] ${message}`);
        errors.push({ message, status: JobReportStatus.Failed });
      }

      if (!dayjs(row.expiration).isValid()) {
        const message = `Row: ${i + 1} contains an invalid expiration date: ${row.expiration}`;
        console.log(`[-] ${message}`);
        errors.push({ message, status: JobReportStatus.Failed });
      }

      // validate that all values are valid (1, 0, -1)
      if (row.value !== '1' && row.value !== '0' && row.value !== '-1') {
        const message = `Row: ${i + 1} contains an invalid value: ${row.value}`;
        console.log(`[-] ${message}`);
        errors.push({ message, status: JobReportStatus.Failed });
      }

      // TODO: validate replacement primary data source id is valid
      if (!!company && !!dataSource && row.action.toLowerCase() === 'remove' && !!row.primaryReplacementDataSourceId) {
        const timestamp = dayjs().utc().toDate();

        const primaryReplacementDataSource = await CompanyDataSourceModel.findOne({
          $and: [
            { company },
            { source: row.primaryReplacementDataSourceId },
            { 'dateRange.start': { $lte: timestamp } },
            { 'dateRange.end': { $gte: timestamp } },
          ],
        });

        if (!primaryReplacementDataSource) {
          const message = `Row: ${i + 1} contains an invalid primary replacement data source id: ${row.primaryReplacementDataSourceId}`;
          console.log(`[-] ${message}`);
          errors.push({ message, status: JobReportStatus.Failed });
        }
      }
    }

    if (!!company && !!dataSource && row.action.toLowerCase() === 'update') {
      if (!row.isPrimary && !row.expiration && !row.value) {
        const message = `Row: ${i + 1} does not contain any updatable data. Fields that can be updated are isPrimary, expiration, and value.`;
        console.log(`[-] ${message}`);
        errors.push({ message, status: JobReportStatus.Failed });
      }

      if (!!row.isPrimary && row.isPrimary.toLowerCase() !== 'true' && row.isPrimary.toLowerCase() !== 'false') {
        const message = `Row: ${i + 1} contains an invalid isPrimary value: ${row.isPrimary}`;
        console.log(`[-] ${message}`);
        errors.push({ message, status: JobReportStatus.Failed });
      }

      if (!!row.expiration && !dayjs(row.expiration).isValid()) {
        const message = `Row: ${i + 1} contains an invalid expiration date: ${row.expiration}`;
        console.log(`[-] ${message}`);
        errors.push({ message, status: JobReportStatus.Failed });
      }

      if (!!row.value && row.value !== '1' && row.value !== '0' && row.value !== '-1') {
        const message = `Row: ${i + 1} contains an invalid value: ${row.value}`;
        console.log(`[-] ${message}`);
        errors.push({ message, status: JobReportStatus.Failed });
      }
    }
  }

  if (!!errors.length) {
    await updateJobReport(jobReportId, JobReportStatus.Failed, errors);
    console.log('[-] raw data failed validation');
    return;
  }

  console.log('[+] raw data validated');
  return true;
};

export const addCompanyDataSource = async (company: ICompanyDocument, dataSource: IDataSourceDocument, expiration: string, value: number, isPrimary: boolean): Promise<[boolean, string]> => {
  const timestamp = dayjs().utc();

  // TODO: figure out what to do if a primary data source is added

  const existingCompanyDataSources = await CompanyDataSourceModel.find({
    $and: [
      { company },
      { 'dateRange.startDate': { $lte: timestamp } },
      { 'dateRange.endDate': { $gte: timestamp } },
    ],
  });

  const existingCompanyDataSource = existingCompanyDataSources.find(d => d.source.toString() === dataSource._id.toString());
  const hasPrimary = existingCompanyDataSources.find(d => d.isPrimary);

  if (!!existingCompanyDataSource) {
    existingCompanyDataSource.dateRange.end = timestamp.toDate();
  }

  const companyDataSource = new CompanyDataSourceModel({
    company,
    source: dataSource,
    status: value,
    dateRange: {
      start: timestamp.add(1, 'millisecond').toDate(),
      end: dayjs(expiration).utc().toDate(),
    },
    isPrimary,
  });

  let errorCreatingCompanyDataSource = false;

  try {
    await existingCompanyDataSource?.save();
    await companyDataSource.save();
  } catch (err) {
    errorCreatingCompanyDataSource = true;
    const message = `failed to create company data source mapping for company: ${company.companyName} and data source: ${dataSource.name}`;
    console.log(`[-] ${message}`);
    return [false, message];
  }

  if (!errorCreatingCompanyDataSource && company.hidden.status) {
    let updated = false;

    // if the company is hidden because previously didnt have a primary data source, update the company to be visible
    if (!hasPrimary && isPrimary && company.hidden.reason === CompanyHideReasons.NoPrimaryDataSource) {
      updated = true;
      company.hidden = {
        status: false,
        reason: CompanyHideReasons.None,
        lastModified: timestamp.toDate(),
      };
    }

    // if the company is hidden because previously didnt have any data sources, update the company to be visible
    // if the new data source is primary...otherwise, keep company hidden, but change reason to NoDataSources
    if (!updated && !existingCompanyDataSources.length && company.hidden.reason === CompanyHideReasons.NoDataSources) {
      updated = true;
      company.hidden = {
        status: !isPrimary,
        reason: isPrimary ? CompanyHideReasons.None : CompanyHideReasons.NoPrimaryDataSource,
        lastModified: timestamp.toDate(),
      };
    }

    if (!updated) return [true, ''];

    try {
      await CompanyModel.updateOne({ company }, { hidden: company.hidden });
      return [true, ''];
    } catch (err: any) {
      const message = `Failed to update hidden status for company: ${company.companyName} (${company._id}): ${err.message}`;
      console.log(`[-] ${message}`);
      return [false, message];
    }
  }

  if (company.creation?.status === CompanyCreationStatus.PendingDataSources) {
    company.creation.status = CompanyCreationStatus.PendingScoreCalculations;

    try {
      await CompanyModel.updateOne({ company }, { creation: company.creation });
      return [true, ''];
    } catch (err: any) {
      const message = `Failed to update creation status for company: ${company.companyName} (${company._id}): ${err.message}`;
      console.log(`[-] ${message}`);
      return [false, message];
    }
  }

  return [true, null];
};

export const removeCompanyDataSource = async (
  company: ICompanyDocument,
  dataSource: IDataSourceDocument,
  primaryReplacementDataSourceId: string,
  dataSources: IDataSourceDocument[],
  altEnvDataSources: IAltDataSource[],
): Promise<[boolean, string]> => {
  const timestamp = dayjs().utc().toDate();

  let companyDataSources: ICompanyDataSourceDocument[] = [];

  try {
    companyDataSources = await CompanyDataSourceModel
      .find({
        $and: [
          { company },
          { 'dateRange.startDate': { $lte: timestamp } },
          { 'dateRange.endDate': { $gte: timestamp } },
        ],
      })
      .populate({
        path: 'source',
        model: DataSourceModel,
      });

    if (!companyDataSources.length) {
      return [false, `No company data source mappings found for company: ${company._id} - ${company.companyName}.`];
    }
  } catch (err) {
    const message = `failed to retrieve company data sources for ${company.companyName}`;
    console.log(`[-] ${message}`);
    return [false, message];
  }

  const companyDataSource = companyDataSources.find(d => d.source.toString() === dataSource._id.toString());
  if (!companyDataSource) return [true, ''];

  if (companyDataSources.length <= 1 || companyDataSource.isPrimary) {
    let replacementCompanyDataSource: ICompanyDataSourceDocument;

    // if the company's primary data source is being removed, it
    // either needs to be replaced with another, or the company
    // needs to be hidden.
    if (companyDataSource.isPrimary) {
      if (!!primaryReplacementDataSourceId) {
        if (altEnvDataSources.length) {
          const dataSourceName = altEnvDataSources.find(d => d.dataSourceId === primaryReplacementDataSourceId)?.dataSourceName;
          if (!!dataSourceName) replacementCompanyDataSource = companyDataSources.find(d => (d.source as IDataSourceDocument).name === dataSourceName);
        } else {
          replacementCompanyDataSource = companyDataSources.find(d => (d.source as IDataSourceDocument)._id.toString() === primaryReplacementDataSourceId);
        }

        if (!replacementCompanyDataSource) {
          const message = `No company data source found for primary replacement data source id: ${primaryReplacementDataSourceId}`;
          console.log(`[-] ${message}`);
          return [false, message];
        }

        replacementCompanyDataSource.isPrimary = true;

        try {
          await replacementCompanyDataSource.save();
        } catch (err: any) {
          const message = `failed to update primary data source for company: ${company.companyName} - ${err.message}`;
          console.log(`[-] ${message}`);
          console.log(err);
          return [false, message];
        }
      } else {
        company.notes = `${!!company.notes ? `${company.notes} ` : ''}\n${dayjs().utc().format('DD MMM, YYYY @ hh:mm')} - Primary data source removed with no replacement specified.`;
        company.hidden.status = true;
        company.hidden.reason = CompanyHideReasons.NoPrimaryDataSource;
      }
    } else {
      company.notes = `${!!company.hidden.reason ? `${company.hidden.reason} ` : ''}\n${dayjs().utc().format('DD MMM, YYYY @ hh:mm')} - All data sources removed.`;
      company.hidden.status = true;
      company.hidden.reason = CompanyHideReasons.NoDataSources;
    }

    try {
      await company.updateOne({ _id: company._id }, { hidden: company.hidden });
    } catch (err) {
      const message = `failed to update company hidden status for ${company.companyName}`;
      console.log(`[-] ${message}`);
      return [false, message];
    }
  }

  try {
    companyDataSource.dateRange.end = timestamp;
    await companyDataSource.save();
    return [true, ''];
  } catch (err) {
    const message = `failed to remove company data source mapping for company: ${company.companyName} and data source: ${dataSource.name}`;
    console.log(`[-] ${message}`);
    return [false, message];
  }
};

export const updateCompanyDataSource = async (
  company: ICompanyDocument,
  dataSource: IDataSourceDocument,
  expiration: string,
  value: string,
  isPrimary: string,
  primaryReplacementDataSourceId: string,
  altEnvDataSources: IAltDataSource[],
): Promise<[boolean, string]> => {
  const timestamp = dayjs().utc();
  const companyDataSources = await CompanyDataSourceModel
    .find({
      company,
      'dateRange.start': { $lte: timestamp.toDate() },
      'dateRange.end': { $gte: timestamp.toDate() },
    })
    .populate({
      path: 'source',
      model: DataSourceModel,
    });

  const companyDataSource = companyDataSources.find(d => (d.source as IDataSourceDocument)._id.toString() === dataSource._id.toString());

  if (!companyDataSource) {
    const message = `No company data source found for company: ${company.companyName} and data source: ${dataSource.name}`;
    console.log(`[-] ${message}`);
    return [false, message];
  }

  const clone = companyDataSource.toObject();
  delete clone._id;

  const newCompanyDataSource = new CompanyDataSourceModel({
    ...clone,
    dateRange: {
      start: timestamp.add(1, 'millisecond').toDate(),
      end: dayjs(companyDataSource.dateRange.end).utc().toDate(),
    },
  });

  companyDataSource.dateRange.end = timestamp.toDate();

  if (!!expiration) {
    const _expiration = dayjs(expiration).utc();
    if (!_expiration.isValid()) {
      const message = `Invalid expiration date: ${expiration} found for company: ${company.companyName} and data source: ${dataSource.name}`;
      console.log(`[-] ${message}`);
      return [false, message];
    }

    const startDate = dayjs(companyDataSource.dateRange.start).utc();

    if (startDate.isAfter(_expiration)) {
      const message = `Expiration date: ${expiration} is before start date: ${startDate.format('DD MMM, YYYY')} for company: ${company.companyName} and data source: ${dataSource.name}`;
      console.log(`[-] ${message}`);
      return [false, message];
    }

    newCompanyDataSource.dateRange.end = _expiration.toDate();
  }

  if (!!value) {
    const _value = !!value ? parseInt(value) : 0;
    newCompanyDataSource.status = _value;
  }

  if (!!isPrimary) {
    if (isPrimary.toLowerCase() === 'true') {
      if (companyDataSource.isPrimary) {
        const message = `Company data source: ${dataSource.name} is already primary for company: ${company.companyName}`;
        console.log(`[-] ${message}`);
        return [false, message];
      }

      const primaryCompanyDataSource = companyDataSources.find(d => d.isPrimary);

      if (!!primaryCompanyDataSource) {
        primaryCompanyDataSource.isPrimary = false;
        try {
          await primaryCompanyDataSource.save();
        } catch (err: any) {
          const message = `failed to update primary data source for company: ${company.companyName} - ${err.message}`;
          console.log(`[-] ${message}`);
          return [false, message];
        }
      }

      newCompanyDataSource.isPrimary = true;

      if (company.hidden.status && company.hidden.reason === CompanyHideReasons.NoPrimaryDataSource) {
        company.hidden = {
          status: false,
          reason: CompanyHideReasons.None,
          lastModified: timestamp.toDate(),
        };

        try {
          await CompanyModel.updateOne({ _id: company._id }, { hidden: company.hidden });
        } catch (err) {
          const message = `failed to update company hidden status for ${company.companyName}`;
          console.log(`[-] ${message}`);
          console.log(err);
          return [false, message];
        }
      }
    } else {
      if (!companyDataSource.isPrimary) {
        const message = `Company data source: ${dataSource.name} is already not the primary for company: ${company.companyName}`;
        console.log(`[-] ${message}`);
        return [false, message];
      }

      if (!!primaryReplacementDataSourceId) {
        let replacementCompanyDataSource: ICompanyDataSourceDocument;

        if (altEnvDataSources.length) {
          const dataSourceName = altEnvDataSources.find(d => d.dataSourceId === primaryReplacementDataSourceId)?.dataSourceName;
          if (!!dataSourceName) replacementCompanyDataSource = companyDataSources.find(d => (d.source as IDataSourceDocument).name === dataSourceName);
        } else {
          replacementCompanyDataSource = companyDataSources.find(d => (d.source as IDataSourceDocument)._id.toString() === primaryReplacementDataSourceId);
        }

        if (!replacementCompanyDataSource) {
          const message = `No company data source found for primary replacement data source id: ${primaryReplacementDataSourceId}`;
          console.log(`[-] ${message}`);
          return [false, message];
        }

        newCompanyDataSource.isPrimary = false;

        replacementCompanyDataSource.dateRange.end = timestamp.toDate();

        const newReplacementCompanyDataSource = new CompanyDataSourceModel({
          ...replacementCompanyDataSource.toObject(),
          dateRange: {
            start: timestamp.add(1, 'millisecond').toDate(),
            end: dayjs(replacementCompanyDataSource.dateRange.end).utc().toDate(),
          },
        });

        try {
          await newReplacementCompanyDataSource.save();
          await CompanyDataSourceModel.updateOne({ _id: replacementCompanyDataSource._id }, { dateRange: replacementCompanyDataSource.dateRange });
          await CompanyModel.updateOne({ _id: company._id }, { hidden: company.hidden });
        } catch (err: any) {
          const message = `failed to update primary data source for company: ${company.companyName} - ${err.message}`;
          console.log(`[-] ${message}`);
          console.log(err);
          return [false, message];
        }
      } else {
        company.hidden = {
          status: true,
          reason: CompanyHideReasons.NoPrimaryDataSource,
          lastModified: timestamp.toDate(),
        };

        try {
          await CompanyModel.updateOne({ _id: company._id }, { hidden: company.hidden });
        } catch (err) {
          const message = `failed to update company hidden status for ${company.companyName}`;
          console.log(`[-] ${message}`);
          console.log(err);
          return [false, message];
        }
      }
    }
  }

  try {
    await newCompanyDataSource.save();
    await CompanyDataSourceModel.updateOne({ _id: companyDataSource._id }, companyDataSource.toObject());
    return [true, ''];
  } catch (err: any) {
    const message = `failed to update company data source mapping for company: ${company.companyName} and data source: ${dataSource.name} - ${err.message}`;
    console.log(`[-] ${message}`);
    console.log(err);
    return [false, message];
  }
};

export const updateJobReports = async (jobReport: IJobReportDocument, successMessages: IUpdateJobReportData[] = [], errorMessages: IUpdateJobReportData[] = []) => {
  await updateJobReport(
    jobReport._id,
    successMessages?.[successMessages.length - 1]?.status,
    [
      ...errorMessages,
      ...successMessages,
    ],
  );

  // if a prevJobReportId is present, it means that this data source mapping is
  // the final step in another flow (like creating new companies), so we need to
  // update the previous job report
  if (!!jobReport.prevJobReports?.length) {
    for (const prevJobReport of jobReport.prevJobReports) {
      await updateJobReport(
        (prevJobReport as IJobReportDocument)._id.toString(),
        null,
        successMessages,
      );
    }
  }
};

export const updateCompanyDataSources = async ({ jobReport, rawData, companies, dataSources, altEnvCompanies, altEnvDataSources }: IConfig) => {
  console.log('\nupdating company data sources...');

  const errors: IUpdateJobReportData[] = [];
  let addedCount = 0;
  let totalAddedCount = 0;
  let removedCount = 0;
  let totalRemovedCount = 0;
  let updatedCount = 0;
  let totalUpdatedCount = 0;

  for (const row of rawData) {
    let company: ICompanyDocument;

    if (altEnvCompanies.length) {
      const companyName = altEnvCompanies.find(c => c.companyId === row.companyId)?.companyName;
      if (!!companyName) company = companies.find(c => c.companyName === companyName);
    } else {
      company = companies.find(c => c._id.toString() === row.companyId);
    }

    let dataSource: IDataSourceDocument;

    if (altEnvDataSources.length) {
      const dataSourceName = altEnvDataSources.find(d => d.dataSourceId === row.dataSourceId)?.dataSourceName;
      if (!!dataSourceName) dataSource = dataSources.find(d => d.name === dataSourceName);
    } else {
      dataSource = dataSources.find(d => d._id.toString() === row.dataSourceId);
    }

    if (row.action?.toLowerCase() === 'add') {
      totalAddedCount += 1;
      const value = !!row.value ? parseInt(row.value) : 0;
      const [result, message] = await addCompanyDataSource(company, dataSource, row.expiration, value, row.isPrimary?.toLowerCase() === 'true');
      if (result) {
        addedCount += 1;
      } else {
        errors.push({ message, status: JobReportStatus.Failed });
      }
    }

    if (row.action?.toLowerCase() === 'remove') {
      totalRemovedCount += 1;
      const [result, message] = await removeCompanyDataSource(company, dataSource, row.primaryReplacementDataSourceId, dataSources, altEnvDataSources);
      if (result) {
        removedCount += 1;
      } else {
        errors.push({ message, status: JobReportStatus.Failed });
      }
    }

    if (row.action?.toLowerCase() === 'update') {
      totalUpdatedCount += 1;
      const [result, message] = await updateCompanyDataSource(company, dataSource, row.expiration, row.value, row.isPrimary, row.primaryReplacementDataSourceId, altEnvDataSources);
      if (result) {
        updatedCount += 1;
      } else {
        errors.push({ message, status: JobReportStatus.Failed });
      }
    }
  }

  const messages: IUpdateJobReportData[] = [];

  if (!!removedCount) {
    messages.push({
      message: `${removedCount}/${totalRemovedCount} company data source mappings removed`,
      status: JobReportStatus.Completed,
    });
  }

  if (!!addedCount) {
    messages.push({
      message: `${addedCount}/${totalAddedCount} company data source mappings added`,
      status: JobReportStatus.Completed,
    });
  }

  if (!!updatedCount) {
    messages.push({
      message: `${updatedCount}/${totalUpdatedCount} company data source mappings updated`,
      status: JobReportStatus.Completed,
    });
  }

  if (!!errors.length) {
    if (!!addedCount || !!removedCount) {
      messages.push({
        message: `company data source mappings updated but with ${errors.length} errors`,
        status: JobReportStatus.CompletedWithErrors,
      });
    } else {
      messages.push({
        message: 'failed to update company data source mappings',
        status: JobReportStatus.Failed,
      });
    }
  } else {
    if (!!addedCount || !!removedCount || !!updatedCount) {
      messages.push({
        message: 'company data source mappings updated',
        status: JobReportStatus.Completed,
      });
    } else {
      messages.push({
        message: 'something strange has happened...',
        status: JobReportStatus.Unknown,
      });
    }
  }

  await updateJobReports(
    jobReport,
    messages,
    errors,
  );

  for (const message of messages) {
    console.log(`[+] ${message.message}`);
  }
};

export const exec = async ({ fileUrl, jobReportId }: IUpdateBatchCompaniesToDataSourceData) => {
  console.log('\nupdating company => data source mappings...\n');

  await updateJobReport(jobReportId, JobReportStatus.Processing);

  const [companies, dataSources, jobReport, altEnvCompanies, altEnvDataSources] = await getExistingData(jobReportId);
  if (!companies?.length || !dataSources || !jobReport) return;

  const rawData = await loadRawData(fileUrl, jobReportId);
  if (!rawData?.length) return;

  const config = { jobReportId, jobReport, rawData, companies, dataSources, altEnvCompanies, altEnvDataSources };

  const isValidRawData = await validateRawData(config);
  if (!isValidRawData) return;

  await updateCompanyDataSources(config);
};
