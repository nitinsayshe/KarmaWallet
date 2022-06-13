import fs from 'fs';
import path from 'path';
import { parse } from 'json2csv';
import { TransactionModel } from '../../models/transaction';
import { CompanyModel } from '../../models/company';
import { UserModel } from '../../models/user';

const CSV_PATH = path.join(__dirname, '.tmp', 'transactions.csv');

const FIELDS = ['_id', 'user', 'company', 'card', 'sector', 'amount', 'date', 'integrations', 'createdOn', '__v', 'lastModified', 'matchType', 'association', 'matched'];

export const generateTransactionCsv = async () => {
  console.log('\ngenerating transaction csv...');
  let transactionCount = 0;
  try {
    if (fs.existsSync(CSV_PATH)) fs.unlinkSync(CSV_PATH);

    const users = await UserModel.find({}).select('_id').lean();

    for (const user of users) {
      const transactions = await TransactionModel.find({ user })
        .populate(
          [
            {
              path: 'company',
              model: CompanyModel,
            },
          ],
        ).lean();

      if (!transactions?.length) continue;

      if (fs.existsSync(CSV_PATH)) {
        const _csv = parse(
          transactions,
          {
            header: false,
            fields: FIELDS,
          },
        );

        fs.appendFileSync(CSV_PATH, _csv);
      } else {
        const _csv = parse(transactions);
        fs.writeFileSync(CSV_PATH, _csv);
      }
      transactionCount += transactions.length;
    }

    console.log(`[+] transaction report generated successfully with ${transactionCount} transactions\n`);
  } catch (err: any) {
    console.log('[-] error generating transaction csv');
    console.log(err.message);
  }
};
