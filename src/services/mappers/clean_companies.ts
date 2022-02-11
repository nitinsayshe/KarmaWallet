import { IRequest } from '../../types/request';

const { CompanyModel } = require('../../models/company');

/**
 * USE THIS SERVICE TO MANAGE DATA IN SOME WAY.
 * WILL MOST COMMONLY BE USED FROM THE ADMIN AREA
 * FOR DATA CLEAN UP OR TRIGGERING MAPPINGS.
 */

export const cleanCompanies = async (_: IRequest) => {
  console.log('\ncleaning compnay data...');
  const companies = await CompanyModel.find();

  for (const company of companies) {
    // remove legacy slug from company
    // will now be computed based on name
    delete company.slug;

    // verify dataSource is valid
    // some companies were originally saved with
    // invalid dataSources that do not match
    // the enum specified in the company
    // schema.
    if (!!company.dataSource) {
      switch (company.dataSource.toLowerCase()) {
        case 'justcapital':
          company.dataSource = 'justCapital';
          break;
        case '1fortheplanet':
          company.dataSource = '1ForThePlanet';
          break;
        case 'bcorp':
          company.dataSource = 'bCorp';
          break;
        case 'cdpclimatechange':
          company.dataSource = 'cdpClimateChange';
          break;
        case 'cdpforests':
          company.dataSource = 'cdpForests';
          break;
        case 'cdpwatersecurity':
          company.dataSource = 'cdpWaterSecurityw';
          break;
        case 'greenseal':
          company.dataSource = 'greenSeal';
          break;
        case 'saferchoice':
          company.dataSource = 'saferChoice';
          break;
        default:
          console.log(`unknown data source: ${company.dataSource}`);
          company.dataSource = null;
          break;
      }
    }

    await company.save();
  }

  console.log('[+] company data cleaned\n');

  // TODO: add new virtual slug to company model...

  return true;
};

// TODO: change companyName to name
// TODO: migrate hidden companies into companies collection and add hidden property
// TODO: migrate unsdgs to own collection
// TODO: migrate certs to own collection
