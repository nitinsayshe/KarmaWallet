import fs from 'fs';
import path from 'path';
import { parse } from 'json2csv';
import { TransactionModel } from '../../models/transaction';
import { CompanyModel } from '../../models/company';

export const generateTransactionCsv = async () => {
  console.log('\ngenerating transaction csv...');
  try {
    // since loadModels was removed from mongo client we need to import company model to be able to populate
    await CompanyModel.findOne({ legacyId: 10000 });
    const transactions = await TransactionModel.find({})
      .populate(
        [
          {
            path: 'companyId',
            model: 'company',
          },
        ],
      ).lean();

    const _csv = parse(transactions);
    fs.writeFileSync(path.join(__dirname, '.tmp', 'transactions.csv'), _csv);

    console.log(`[+] transaction repcsvort generated successfully with ${transactions.length} transactions\n`);
  } catch (err: any) {
    console.log('[-] error generating transaction csv');
    console.log(err.message);
  }
};
