import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { CompanyDataSourceModel } from '../../models/companyDataSource';
import { CompanyModel } from '../../models/company';

dayjs.extend(utc);

export const hideCompaniesWithoutDataSources = async () => {
  const companies = await CompanyModel.find({});

  if (!companies) return;

  let hiddenCompanies = 0;
  let unhiddenCompanies = 0;

  for (let i = 0; i < companies.length; i++) {
    const company = companies[i];
    console.log(`\n${i + 1}/${companies.length} - ${company.companyName}`);
    const dataSource = await CompanyDataSourceModel.findOne({ company: company._id, 'dateRange.start': { $lte: dayjs().utc().toDate() }, 'dateRange.end': { $gte: dayjs().utc().toDate() } });
    if (!dataSource && !company.hidden.status) {
      console.log(`${company.companyName} is being hidden`);
      company.hidden = {
        status: true,
        reason: 'no data sources',
        lastModified: dayjs().utc().toDate(),
      };
      await company.save();
      hiddenCompanies += 1;
      continue;
    }
    if (!!dataSource && company.hidden.status && company.hidden.reason === 'no data sources') {
      console.log(`${company.companyName} is being unhidden`);
      company.hidden = {
        status: false,
        reason: '',
        lastModified: dayjs().utc().toDate(),
      };
      unhiddenCompanies += 1;
      await company.save();
    }
  }

  console.log(`\n${hiddenCompanies} companies hidden\n${unhiddenCompanies} companies unhidden\n`);
};
