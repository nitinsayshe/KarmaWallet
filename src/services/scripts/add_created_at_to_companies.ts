import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { CompanyModel } from '../../models/company';

dayjs.extend(utc);

export const addCreatedAtToCompanies = async () => {
  console.log('adding created at to companies...');

  const companies = await CompanyModel.find({});
  let count = 0;

  const timestamp = dayjs('Jan 1, 2022').utc().toDate();

  for (const company of companies) {
    try {
      company.createdAt = timestamp;

      await company.save();
      count += 1;
    } catch (err) {
      console.log(`[-] error adding createdAt to company: ${company._id}`);
      console.log(err, '\n');
    }
  }

  console.log(`[+] ${count}/${companies.length} companies updated`);
};
