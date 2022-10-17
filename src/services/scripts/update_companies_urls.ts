import { CompanyModel } from '../../models/company';

// const fs = require('fs');
// const { ObjectId } = require('mongodb');

export const updateCompaniesUrls = async () => {
  const companies = await CompanyModel.find({
    $and: [
      { url: { $not: /^null/ } },
      { url: { $ne: '' } },
      { url: { $not: /^http/ } },
    ],
  });

  for (const company of companies) {
    company.url = `https://${company.url}`;
    await company.save();
  }

  console.log(`[+] ${companies.length} companies updated`);
};

export const sanitizeUrls = async () => {
  const companies = await CompanyModel.find({});

  for (const company of companies) {
    const endsInSlash = /\/$/;
    let companyUrl = company.url;
    console.log(`[+] company url before: ${companyUrl}`);
    if (companyUrl.includes('?')) companyUrl = companyUrl.replace(/\?.*/, '');
    if (companyUrl.indexOf('http:') > -1) companyUrl = companyUrl.replace('http:', 'https:');
    if (endsInSlash.test(companyUrl)) companyUrl = companyUrl.replace(/\/$/, '');
    company.url = companyUrl.toLowerCase();
    await company.save();
  }
};

// export const resetCompaniesUrls = async () => {
//   const companiesJson = await csv().fromFile('./companies_prod.csv');

//   for (const company of companiesJson) {
//     const dbCompany = await CompanyModel.findOne({
//       _id: ObjectId(company._id),
//     });

//     dbCompany.url = company.url;
//     await dbCompany.save();
//     console.log('////// matching company: ', dbCompany.url);
//   }
// };
