import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { CompanyHideReasons, CompanyModel } from '../../models/company';
import { CompanyDataSourceModel } from '../../models/companyDataSource';

dayjs.extend(utc);

export const updateCompanyHideReasons = async () => {
  console.log('updating company hidden reasons...');

  let companies = await CompanyModel.find({ 'creation.status': null, 'hidden.status': false });

  if (!companies) return;

  let noDataSourcesCount = 0;

  for (const company of companies) {
    const companyDataSources = await CompanyDataSourceModel.find({ company });

    if (companyDataSources.length === 0) {
      company.hidden = {
        status: true,
        reason: CompanyHideReasons.NoDataSources,
        lastModified: dayjs().utc().toDate(),
      };

      noDataSourcesCount += 1;

      await company.save();
    }
  }

  companies = await CompanyModel.find({ 'creation.status': null, 'hidden.status': true, 'hidden.reason': { $ne: CompanyHideReasons.NoDataSources } });

  let otherCount = 0;

  for (const company of companies) {
    company.notes = `${!!company.notes ? `${company.notes}\n ` : ''}${dayjs().utc().format('DD MMM, YYYY @ hh:mm')} - ${company.hidden.reason}`;

    company.hidden = {
      status: company.hidden.status,
      reason: CompanyHideReasons.Manual,
      lastModified: dayjs().utc().toDate(),
    };

    otherCount += 1;

    await company.save();
  }

  console.log(`[+] ${noDataSourcesCount} companies hidden because of no data sources`);
  console.log(`[+] ${otherCount} companies hidden for other reasons\n`);
};
