import { asCustomError } from '../../lib/customError';
import { CompanyModel } from '../../models/company';
import { LegacyCompanyModel } from '../../models/legacyCompany';

export const mapParentCompanies = async () => {
  try {
    console.log('updating companies with correct parent companies...');
    const companies = await CompanyModel.find({});
    const legacyCompanies = await LegacyCompanyModel.find({});

    let legacyCount = 0;
    for (const legacyCompany of legacyCompanies) {
      if (legacyCompany._id !== legacyCompany.parentCompany) {
        const company = companies.find(c => c.legacyId === legacyCompany._id);
        const parentCompany = companies.find(c => c.legacyId === legacyCompany.parentCompany);

        if (!company) {
          console.log('[-] failed to find company', legacyCompany._id);
          continue;
        }

        if (!parentCompany) {
          console.log('[-] failed to find parent company', legacyCompany.parentCompany);
          continue;
        }

        company.parentCompany = parentCompany;
        await company.save();

        legacyCount += 1;
      }
    }

    console.log(`[+] ${legacyCount} companies updated with correct parent company`);

    console.log('\nremoving instances of companies referencing themselves as their parentCompany...');

    let count = 0;
    for (const company of companies) {
      if (company._id.toString() === company.parentCompany?.toString()) {
        company.parentCompany = null;
        await company.save();
        count += 1;
      }
    }

    console.log(`removed ${count} instances of companies referencing themselves as their parent`);
  } catch (err) {
    throw asCustomError(err);
  }
};
