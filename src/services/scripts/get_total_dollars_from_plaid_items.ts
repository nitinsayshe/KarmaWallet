import fs from 'fs';
import path from 'path';
import { parse } from 'json2csv';
import { PlaidItemModel } from '../../models/plaidItem';

export const getTotalDollarsFromPlaidItems = async () => {
  const plaidItems = await PlaidItemModel.find({}).lean();

  const totals: {[key: string]: { gas: number; gasTransactions: number; airline: number; airlineTransactions: number } } = {};

  for (const item of plaidItems) {
    if (!totals[item.userId]) {
      totals[item.userId] = { gas: 0, gasTransactions: 0, airline: 0, airlineTransactions: 0 };
    }

    for (const transaction of item.transactions) {
      if ((transaction.category || []).includes('Gas Stations')) {
        totals[item.userId].gas += transaction.amount;
        totals[item.userId].gasTransactions += 1;
      } else if ((transaction.category || []).includes('Airlines and Aviation Services') || (transaction.category || []).includes('Airports')) {
        totals[item.userId].airline += transaction.amount;
        totals[item.userId].airlineTransactions += 1;
      }
    }
  }

  const parsedTotals = Object.entries(totals).map(([key, value]) => ({
    userId: key,
    gas: value.gas,
    gasTransactions: value.gasTransactions,
    airline: value.airline,
    airlineTransactions: value.airlineTransactions,
  }));

  const _csv = parse(parsedTotals);
  fs.writeFileSync(path.join(__dirname, '.tmp', 'gas_and_airline_totals.csv'), _csv);
};
