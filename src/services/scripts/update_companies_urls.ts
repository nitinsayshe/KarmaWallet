import { CompanyModel } from '../../models/company';

// const fs = require('fs');
// const { ObjectId } = require('mongodb');

export const updateCompaniesUrls = async () => {
  const companies = await CompanyModel.find({
    url: {
      $not: /^http/,
      $regex: 'www',
    },
  });

  for (const company of companies) {
    company.url = `https://${company.url}`;
    await company.save();
  }

  console.log(`[+] ${companies.length} companies updated`);
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
