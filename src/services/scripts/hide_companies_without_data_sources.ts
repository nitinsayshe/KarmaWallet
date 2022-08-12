import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { ObjectId } from 'mongoose';
import { CompanyDataSourceModel } from '../../models/companyDataSource';
import { CompanyHideReasons, CompanyModel } from '../../models/company';

dayjs.extend(utc);

export const hideCompaniesWithoutDataSources = async () => {
  const companies = await CompanyModel.find({});

  if (!companies) return;

  let hiddenCompanies = 0;
  let unhiddenCompanies = 0;

  for (let i = 0; i < companies.length; i++) {
    const company = companies[i];
    console.log(`\n${i + 1}/${companies.length} - ${company.companyName}`);
    // if company has parent company, add ID to query
    const companyQuery = { $or: [{ _id: company._id }] };
    if (company.parentCompany) companyQuery.$or.push({ _id: (company.parentCompany as ObjectId) });
    const dataSource = await CompanyDataSourceModel.findOne({ companyQuery, 'dateRange.start': { $lte: dayjs().utc().toDate() }, 'dateRange.end': { $gte: dayjs().utc().toDate() } });
    if (!dataSource && !company.hidden.status) {
      console.log(`${company.companyName} is being hidden`);
      company.hidden = {
        status: true,
        reason: CompanyHideReasons.NoDataSources,
        lastModified: dayjs().utc().toDate(),
      };
      await company.save();
      hiddenCompanies += 1;
      continue;
    }
    if (!!dataSource && company.hidden.status && company.hidden.reason === CompanyHideReasons.NoDataSources) {
      console.log(`${company.companyName} is being unhidden`);
      company.hidden = {
        status: false,
        reason: CompanyHideReasons.None,
        lastModified: dayjs().utc().toDate(),
      };

      unhiddenCompanies += 1;
      await company.save();
    }
  }

  console.log(`\n${hiddenCompanies} companies hidden\n${unhiddenCompanies} companies unhidden\n`);
};
