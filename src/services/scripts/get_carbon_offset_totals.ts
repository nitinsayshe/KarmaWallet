import path from 'path';
import fs from 'fs';
import { parse } from 'json2csv';
import { getOffsetTransactions } from '../impact/utils/carbon';

const fields = ['transactionId', 'userId', 'amount', 'tonnes', 'date'];
const opts = { fields };

export const getCarbonOffsetTotals = async ({
  writeToDisk = true,
} = {}) => {
  const formattedTransactions: any[] = [];
  const transactions = await getOffsetTransactions({});
  for (const transaction of transactions) {
    formattedTransactions.push({
      transactionId: transaction._id,
      userId: transaction.user.toString(),
      amount: transaction.integrations.rare.subtotal_amt / 100,
      tonnes: transaction.integrations.rare.tonnes_amt,
      date: transaction.date,
    });
  }
  const _csv = parse(formattedTransactions, opts);

  if (writeToDisk) fs.writeFileSync(path.join(__dirname, '.tmp', 'total_offsets.csv'), _csv);
  return formattedTransactions;
};
