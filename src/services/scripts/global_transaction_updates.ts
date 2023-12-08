/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable no-debugger */
/* eslint-disable no-restricted-syntax */
import fs from 'fs';
import { parse } from 'json2csv';
import { Transaction } from 'plaid';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { Types } from 'mongoose';
import {
  getCleanCompanies,
  getMatchResults,
  matchTransactionsToCompanies,
} from '../../integrations/plaid/v2_matching';
import { IMatchedTransaction } from '../../integrations/plaid/types';
import { V2TransactionMatchedCompanyNameModel } from '../../models/v2_transaction_matchedCompanyName';
import { V2TransactionFalsePositiveModel } from '../../models/v2_transaction_falsePositive';
import { V2TransactionManualMatchModel } from '../../models/v2_transaction_manualMatch';
import { updateTransactions } from '../../integrations/plaid/v2_transaction';
import { ITransaction, TransactionModel } from '../../models/transaction';

dayjs.extend(utc);

export interface IGlobalTransactionUpdatesParams {
  writeOutput?: boolean;
  userId?: Types.ObjectId | string;
  startingUserCursor?: number;
}

export const globalTransactionUpdates = async ({
  writeOutput = false,
  userId = null,
  startingUserCursor = null,
}: IGlobalTransactionUpdatesParams) => {
  const logId = '[gptu] - ';
  const log = (message: string) => {
    console.log(`${logId}${message}`);
  };
  const overallTimestring = `${logId}global plaid transaction mapping for ${dayjs().toISOString()} ---`;
  console.time(overallTimestring);
  log(`global plaid transaction update started for ${dayjs().toISOString()}`);

  // iterate over cards
  // grab transactions for each card

  const output: IMatchedTransaction[] = [];

  const cleanedCompanies = await getCleanCompanies();

  // get false positives
  const falsePositives = await V2TransactionFalsePositiveModel.find({});
  // get manual matches
  const manualMatches = await V2TransactionManualMatchModel.find({});

  // pulling transactions for the access token gets all cards
  const match: any = {
    'integrations.plaid': { $ne: null },
  };
  if (userId) match.user = new Types.ObjectId(userId);

  let usersWithTransactions = await TransactionModel.aggregate([
    {
      $match: match,
    },
    {
      $group: {
        _id: '$user',
        count: {
          $sum: 1,
        },
      },
    },
  ]);

  const originalNumberOfUsers = usersWithTransactions.length;

  let count = 0;

  const run = async ({ startingUserCursorForRun }: { startingUserCursorForRun: number }) => {
    if (startingUserCursorForRun) {
      usersWithTransactions = usersWithTransactions.slice(startingUserCursorForRun - 1);
      count = startingUserCursorForRun;
    }

    try {
      for (const user of usersWithTransactions) {
        console.log('\n');
        log(`updating transactions for user ${user._id.toString()}`);
        log(`${count} out of ${originalNumberOfUsers} users`);
        count += 1;
        startingUserCursorForRun += 1;

        // get already matched each time as it builds on itself
        const alreadyMatchedCompanies = await V2TransactionMatchedCompanyNameModel.find({});

        const allUserTransactions = await TransactionModel.find({ user: user._id, 'integrations.plaid': { $ne: null } }).lean();

        const matchedTransactions: IMatchedTransaction[] = [];

        let remainingTransactions: Transaction[] = [];

        remainingTransactions = allUserTransactions.map(t => ({ datetime: t.date, amount: t.amount, ...t.integrations.plaid }) as any as Transaction);

        const timeString = `${logId}matching for user ${user._id.toString()}`;
        console.time(timeString);

        log(`initial transaction count ${remainingTransactions.length}`);

        // filter out pending transactions
        remainingTransactions = remainingTransactions.filter((t) => !t.pending);
        log(`initial transaction count after pending ${remainingTransactions.length}`);

        // filter out false positives
        const foundFalsePositives: Transaction[] = [];
        remainingTransactions = remainingTransactions.filter((t) => {
          if (falsePositives.find((fp) => fp.originalValue === t[fp.matchType])) {
            foundFalsePositives.push(t);
            return false;
          }
          return true;
        });

        // filter out manual matches
        const foundManualMatches: IMatchedTransaction[] = [];
        remainingTransactions = remainingTransactions.filter((t) => {
          const manualMatch = manualMatches.find((mm) => mm.originalValue === t[mm.matchType]);
          if (manualMatch) {
            foundManualMatches.push({ ...t, company: manualMatch.company });
            return false;
          }
          return true;
        });

        // find already matched companies
        const [_matchedTransactions, nonMatchedTransactions] = matchTransactionsToCompanies(remainingTransactions, alreadyMatchedCompanies);
        remainingTransactions = nonMatchedTransactions;
        matchedTransactions.push(..._matchedTransactions);

        // find new matches
        const newMatches = await getMatchResults({ transactions: remainingTransactions, cleanedCompanies, saveMatches: true });
        const [__matchedTransactions, _nonMatchedTransactions] = matchTransactionsToCompanies(remainingTransactions, newMatches);

        remainingTransactions = _nonMatchedTransactions;
        matchedTransactions.push(...__matchedTransactions);

        // LOGGING
        log(`matchedTransactions ${matchedTransactions.length}`);
        log(`foundFalsePositives ${foundFalsePositives.length}`);
        log(`foundManualMatches ${foundManualMatches.length}`);
        log(`remainingTransactions ${remainingTransactions.length}`);
        console.timeEnd(timeString);

        const newlyMatchedTransactions = [...matchedTransactions, ...foundFalsePositives, ...foundManualMatches, ...remainingTransactions];
        if (writeOutput) output.push(...newlyMatchedTransactions);

        // logic to update transactions
        await updateTransactions(allUserTransactions as ITransaction[], newlyMatchedTransactions);
      }
    } catch (err) {
      log('error - trying again');
      await run({ startingUserCursorForRun: startingUserCursorForRun - 1 });
    }
  };

  await run({ startingUserCursorForRun: startingUserCursor });

  if (writeOutput) {
    const str = JSON.stringify(output, null, 2);
    fs.writeFileSync('output.json', str);
    const _csv = await parse(str);
    fs.writeFileSync('output.csv', _csv);
  }

  console.timeEnd(overallTimestring);
};
