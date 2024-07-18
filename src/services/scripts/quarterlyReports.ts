import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import 'dotenv/config';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import fs from 'fs';
import path from 'path';
import { parse } from 'json2csv';
import { getSpendingTotals } from '../transaction/utils';

dayjs.extend(utc);
dayjs.extend(quarterOfYear);

export const getGasAndMealSpendingLastQuarter = async (startDate?: Date, endDate?: Date) => {
  const lastQuarter = dayjs().utc().subtract(1, 'quarter');
  const startOfQuarter = startDate || lastQuarter.startOf('quarter').toDate();
  const endOfQuarter = endDate || lastQuarter.endOf('quarter').toDate();

  console.log('start of quarter: ', startOfQuarter);
  console.log('end of quarter: ', endOfQuarter);
  const totals = await getSpendingTotals(startOfQuarter, endOfQuarter);

  const csv = parse(totals, {
    fields: ['total', 'gasTotal', 'mealsTotal', 'cashbackMerchantTotal'],
  });

  fs.writeFileSync(path.join(__dirname, './.tmp', `quarterlySpendingReport${startOfQuarter.toISOString()}-${endOfQuarter.toISOString()}.csv`), csv);
  console.log(totals);
};
