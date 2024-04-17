import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import 'dotenv/config';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import { getGasAndMealSpendingTotals } from '../transaction/utils';

dayjs.extend(utc);
dayjs.extend(quarterOfYear);

export const getGasAndMealSpendingLastQuarter = async () => {
  const lastQuarter = dayjs().utc().subtract(1, 'quarter');
  const startOfQuarter = lastQuarter.startOf('quarter').toDate();
  const endOfQuarter = lastQuarter.endOf('quarter').toDate();
  console.log('start of quarter: ', startOfQuarter);
  console.log('end of quarter: ', endOfQuarter);
  const totals = await getGasAndMealSpendingTotals(startOfQuarter, endOfQuarter);
  console.log(totals);
};
