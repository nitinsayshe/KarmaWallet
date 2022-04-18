import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { asCustomError } from '../../lib/customError';
import { CompanyModel, ICompanyDocument } from '../../models/company';
import { ILegacyCompany, LegacyHiddenCompanyModel } from '../../models/legacyCompany';

dayjs.extend(utc);

export interface ICompanyLogos {
  source?: string;
  clearbit?: string;
  ritekit?: string;
  original?: string;
}

type LogoSource = keyof ICompanyLogos;

const BaseLogoUrl = 'https://s3.amazonaws.com/';
const LogoPath = 'logos.karmawallet/';
const RiteKitBase = 'ritekit';
const ClearBitBase = 'clearbit';

type DataSource = 'justCapital' | '1ForThePlanet' | 'bCorp' | 'cdpClimateChange' | 'cdpForests' | 'cdpWaterSecurity' | 'greenSeal' | 'saferChoice';

const cleanDataSource = (dataSource: DataSource) => {
  // verify dataSource is valid
  // some companies were originally saved with
  // invalid dataSources that do not match
  // the enum specified in the company
  // schema.
  switch (dataSource.toLowerCase()) {
    case 'justcapital':
      dataSource = 'justCapital';
      break;
    case '1fortheplanet':
      dataSource = '1ForThePlanet';
      break;
    case 'bcorp':
      dataSource = 'bCorp';
      break;
    case 'cdpclimatechange':
      dataSource = 'cdpClimateChange';
      break;
    case 'cdpforests':
      dataSource = 'cdpForests';
      break;
    case 'cdpwatersecurity':
      dataSource = 'cdpWaterSecurity';
      break;
    case 'greenseal':
      dataSource = 'greenSeal';
      break;
    case 'saferchoice':
      dataSource = 'saferChoice';
      break;
    default:
      console.log(`unknown data source: ${dataSource}`);
      dataSource = null;
      break;
  }

  return dataSource;
};

const getLogo = (company: ILegacyCompany) => {
  let logo = null;

  const {
    source,
    original,
    ritekit,
    clearbit,
  } = (company.logos || {});

  if (!!source && source !== 'noLogo') {
    logo = `${BaseLogoUrl}${source === 'original'
      ? ''
      : `${source}.`}${LogoPath}${company.logos[source as LogoSource]}`;
  }

  if (!!ritekit && !company.logo) {
    logo = `${BaseLogoUrl}${RiteKitBase}.${LogoPath}${ritekit}`;
  }

  if (!!original && !company.logo) {
    logo = `${BaseLogoUrl}${LogoPath}${original}`;
  }

  if (!!clearbit && !company.logo) {
    logo = `${BaseLogoUrl}${ClearBitBase}.${LogoPath}${clearbit}`;
  }

  return logo;
};

export const mapHiddenCompaniesToNew = async () => {
  try {
    console.log('validating hidden companies...');
    const legacyHiddenCompanies = await LegacyHiddenCompanyModel.find({}).lean();
    let companies = await CompanyModel.find({}).lean();

    let invalidCount = 0;

    for (const legacyHiddenCompany of legacyHiddenCompanies) {
      const {
        _id,
        companyName,
        dataSource,
        dataYear,
        parentCompany,
      } = legacyHiddenCompany;

      if (!companyName) {
        invalidCount += 1;
        console.log('>>>>> no company name found', _id);
        continue;
      }

      if (!dataSource) {
        invalidCount += 1;
        console.log('>>>>> no dataSource found', _id);
        continue;
      }

      if (!dataYear) {
        invalidCount += 1;
        console.log('>>>>> no dataYear found', dataYear);
        continue;
      }

      if (!!parentCompany) {
        const parent = legacyHiddenCompanies.find(lhv => lhv._id === parentCompany);
        if (!parent) {
          const newParent = companies.find(c => c.legacyId === parentCompany);
          if (!newParent) {
            invalidCount += 1;
            console.log('>>>>> invalid parentCompany found', _id);
            continue;
          }
        }
      }

      const duplicate = companies.find(c => c.legacyId === _id);
      if (!!duplicate) {
        invalidCount += 1;
        console.log('>>>>> duplicate legacyId found', _id);
        continue;
      }
    }

    if (!!invalidCount) {
      console.log(`\n>>>>> ${invalidCount} legacy hidden companies found\n`);
      return;
    }

    const timestamp = dayjs().utc().toDate();
    let updateCount = 0;

    console.log('[+] validation complete');
    console.log('migrating new companies from hidden legacy companies...');
    for (const legacyHiddenCompany of legacyHiddenCompanies) {
      try {
        const {
          _id,
          companyName,
          dataSource,
          combinedScore,
          dataYear,
          url,
          grade,
          logo,
          relevanceScore,
        } = legacyHiddenCompany;

        const _logo = !!logo ? `${BaseLogoUrl}${LogoPath}${logo}` : getLogo(legacyHiddenCompany);

        const newCompany = new CompanyModel({
          companyName,
          dataSource: cleanDataSource(dataSource),
          combinedScore,
          dataYear,
          url,
          grade,
          logo: _logo,
          relevanceScore,
          legacyId: _id,
          hidden: {
            status: true,
            reason: 'hidden status carried over from legacy data',
            lastModified: timestamp,
          },
        });

        await newCompany.save();

        updateCount += 1;
      } catch (err) {
        console.log(err);
      }
    }

    console.log(`[+] ${updateCount} hidden companies migrated\n`);

    companies = await CompanyModel.find({});

    let updatedWithParentCount = 0;

    console.log('updating companies with parent companies...');
    for (const legacyHiddenCompany of legacyHiddenCompanies) {
      const {
        _id,
        parentCompany,
      } = legacyHiddenCompany;

      if (_id !== parentCompany) {
        const company = companies.find(c => c.legacyId === _id);
        const parent = companies.find(c => c.legacyId === parentCompany);

        if (!!parent) {
          company.parentCompany = parent as ICompanyDocument;
          await (company as ICompanyDocument).save();
          updatedWithParentCount += 1;
        }
      }
    }

    console.log(`[+] ${updatedWithParentCount} companies updated with parent companies\n`);

    // console.log('setting default hidden property for all other companies...');
    // companies = await CompanyModel.find({});
    // let defaultHiddenCompaniesCount = 0;
    // for (const company of companies) {
    //   if (!company.hidden) {
    //     defaultHiddenCompaniesCount += 1;
    //   }
    // }

    // console.log(`[+] ${defaultHiddenCompaniesCount} companies updated with defualt hidden value`);
  } catch (err) {
    throw asCustomError(err);
  }
};
