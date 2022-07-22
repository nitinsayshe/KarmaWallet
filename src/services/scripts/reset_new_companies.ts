// removes any companies that have been created

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { CompanyModel } from '../../models/company';

dayjs.extend(utc);

// in the last 24 hours.
export const resetNewCompanies = async () => {
  console.log('resetting new companies...');

  const timestamp = dayjs().utc().subtract(1, 'day').toDate();

  try {
    await CompanyModel.deleteMany({ createdAt: { $gte: timestamp } });
    console.log('[+] new companies reset');
  } catch (err) {
    console.log('[-] error resetting new companies');
    console.log(err);
  }
};
