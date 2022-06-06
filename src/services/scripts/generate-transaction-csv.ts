import fs from 'fs';
import path from 'path';
import { parse } from 'json2csv';
import { TransactionModel } from '../../models/transaction';
import { CompanyModel } from '../../models/company';

export const generateTransactionCsv = async () => {
  console.log('\ngenerating transaction csv...');
  try {
    const transactions = await TransactionModel.find({})
      .populate(
        [
          {
            // TODO: update this to `company` once Tongass is launched
            path: 'companyId',
            model: CompanyModel,
          },
        ],
      ).lean();

    const _csv = parse(transactions);
    fs.writeFileSync(path.join(__dirname, '.tmp', 'transactions.csv'), _csv);

    console.log(`[+] transaction report generated successfully with ${transactions.length} transactions\n`);
  } catch (err: any) {
    console.log('[-] error generating transaction csv');
    console.log(err.message);
  }
};
