import path from 'path';
import fs from 'fs';
import { CompanyModel } from '../../models/company';
import { removeTrailingSlash } from './clean_company_urls';

export const updateCompaniesUrls = async () => {
  const companies = await CompanyModel.find({});
  let count = 0;
  const urlsToCheck = [];

  for (const company of companies) {
    count += 1;
    if (!!company.hidden.status || !company.hidden.reason) {
      console.log(`[+] Skipping company ${count}/${companies.length}`, company.companyName);
      continue;
    }

    console.log(`[+] Updating company ${count}/${companies.length}`, company.companyName);

    if (!company.url) {
      urlsToCheck.push({ _id: company._id, url: null });
      continue;
    }

    if (company.url.indexOf('.com') !== company.url.length - 4) {
      urlsToCheck.push({ _id: company._id, url: company.url });
    }

    const cleanUrl = removeTrailingSlash(company.url);
    company.url = cleanUrl;
    await company.save();

    if (count === 1 || count % 20 === 0) {
      fs.writeFileSync(path.resolve(__dirname, './.tmp', 'urlsToManuallyCheck.json'), JSON.stringify(urlsToCheck));
    }
  }

  console.log(`[+] ${companies.length} companies updated`);
};
