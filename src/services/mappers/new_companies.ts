import { asCustomError } from '../../lib/customError';
import { CompanyModel, ICompany, ICompanyDocument } from '../../models/company';
import { LegacyCompanyModel } from '../../models/legacyCompany';
import { IRequest } from '../../types/request';

export interface ICompanyLogos {
  source?: string;
  clearbit?: string;
  ritekit?: string;
  original?: string;
}

type LogoSource = keyof ICompanyLogos;

interface ILegacyCompany extends ICompanyDocument {
  logos: {
    source: string;
    ritekit: string;
    original: string;
    clearbit: string;
  }
}

const BaseLogoUrl = 'https://s3.amazonaws.com/';
const LogoPath = 'logos.karmawallet/';
const RiteKitBase = 'ritekit';
const ClearBitBase = 'clearbit';

const setLogo = (company: ICompany) => {
  company.logo = null;

  const {
    source,
    original,
    ritekit,
    clearbit,
  } = ((company as ILegacyCompany).logos || {});

  if (!!source && source !== 'noLogo') {
    company.logo = `${BaseLogoUrl}${source === 'original'
      ? ''
      : `${source}.`}${LogoPath}${(company as ILegacyCompany).logos[source as LogoSource]}`;
  }

  if (!!ritekit && !company.logo) {
    company.logo = `${BaseLogoUrl}${RiteKitBase}.${LogoPath}${ritekit}`;
  }

  if (!!original && !company.logo) {
    company.logo = `${BaseLogoUrl}${LogoPath}${original}`;
  }

  if (!!clearbit && !company.logo) {
    company.logo = `${BaseLogoUrl}${ClearBitBase}.${LogoPath}${clearbit}`;
  }
};

export const resetCompanyMapping = async (_: IRequest) => {
  console.log('resetting company mapping...');

  try {
    // resetting companies includes pulling companies collection
    // from prod and overwriting any local collection changes
    // so only need to remove the legacy company collection.
    await LegacyCompanyModel.deleteMany({});

    console.log('[+] company mapping reset successfully');
  } catch (err) {
    console.log('ERROR RESETTING COMPANY MAPPING');
    console.log(err);
    throw asCustomError(err);
  }
};

export const mapCompaniesToV3 = async (_: IRequest) => {
  console.log('\nupdating companies to v3...');

  const companies = await CompanyModel.find({}).lean();
  let newCompany: ICompanyDocument;
  let count = 0;
  for (const company of companies) {
    if (!company.legacyId) { // preventative measure to ensure this mapping only occurrs on a company once.
      try {
        const legacyCompany = new LegacyCompanyModel({ ...company });

        const legacyId = (company._id as unknown as number);
        delete company._id;
        delete company.parentCompany;

        setLogo(company);
        newCompany = new CompanyModel({ ...company });
        newCompany.legacyId = legacyId;

        await CompanyModel.deleteOne({ companyName: company.companyName, url: company.url });

        // TODO: add mapping the new data source to the company

        // ONE OFF FIXES FOUND IN DATA
        if ((company as any).dataSource === 'Bcorp') {
          legacyCompany.dataSource = 'bCorp';
        }

        await newCompany.save();
        await legacyCompany.save();
      } catch (err) {
        console.log('ERROR UPDATING COMPANY TO V3');
        console.log(err);
        console.log(company);
        console.log(newCompany);
        throw asCustomError(err);
      }
    }
  }

  const newCompanies = await CompanyModel.find({});
  console.log('assigning parent companies...');
  for (const company of newCompanies) {
    try {
      const legacyCompany = await LegacyCompanyModel.findOne({ _id: company.legacyId });

      if (legacyCompany.parentCompany) {
        const parentCompany = await CompanyModel.findOne({ legacyId: legacyCompany._id });
        company.parentCompany = parentCompany;
        await company.save();
      }

      count += 1;
    } catch (err) {
      console.log('ERROR UPDATING PARENT COMPANY');
      console.log(err);
      console.log(company);
      throw asCustomError(err);
    }
  }

  console.log(`[+] ${count}/${companies.length} companies updated\n`);
};
