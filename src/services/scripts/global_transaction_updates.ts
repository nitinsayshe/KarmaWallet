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
import { ITransaction, TransactionModel } from '../../models/transaction';
import { CombinedPartialTransaction } from '../../types/transaction';
import { updatePlaidTransactions } from '../../integrations/plaid/v2_transaction';
import { updateMarqetaTransactions } from '../../integrations/marqeta/transactions';
import { ExcludeCategories } from '../../lib/constants/plaid';

dayjs.extend(utc);

export enum TransactionSource {
  Plaid = 'plaid',
  Marqeta = 'marqeta',
}
export interface IGlobalTransactionUpdatesParams {
  writeOutput?: boolean;
  userId?: Types.ObjectId | string;
  startingUserCursor?: number;
  transactionSource?: TransactionSource;
  useExclusions?: boolean;
  exclusionQuery?: any;
  customTransactionQuery?: any;
}

export const globalTransactionUpdates = async ({
  writeOutput = false,
  userId = null,
  startingUserCursor = null,
  transactionSource = TransactionSource.Plaid,
  useExclusions = true,
  exclusionQuery = {
    plaid: { 'integrations.plaid.category': { $nin: ExcludeCategories } },
  },
  customTransactionQuery,
}: IGlobalTransactionUpdatesParams) => {
  const logId = '[gptu] - ';
  const log = (message: string) => {
    console.log(`${logId}${message}`);
  };
  const overallTimestring = `${logId}global ${transactionSource} transaction mapping for ${dayjs().toISOString()} ---`;
  console.time(overallTimestring);
  log(`global ${transactionSource} transaction update started for ${dayjs().toISOString()}`);

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
    [`integrations.${transactionSource === TransactionSource.Plaid ? 'plaid' : 'marqeta'}`]: { $ne: null },
    ...customTransactionQuery,
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
    {
      $sort: {
        count: 1,
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

        let transactionQuery: any = { user: user._id };

        if (transactionSource === TransactionSource.Plaid) transactionQuery['integrations.plaid'] = { $ne: null };
        if (transactionSource === TransactionSource.Marqeta) transactionQuery['integrations.marqeta'] = { $ne: null };

        if (customTransactionQuery) transactionQuery = { ...transactionQuery, ...customTransactionQuery };
        if (!customTransactionQuery && useExclusions && transactionSource === TransactionSource.Plaid) transactionQuery = { ...transactionQuery, ...exclusionQuery.plaid };
        if (!customTransactionQuery && useExclusions && transactionSource === TransactionSource.Marqeta) {
          // add MQ exclusions
        }

        log(`transactionQuery ${JSON.stringify(transactionQuery)}`);

        const totalUserTransactions = await TransactionModel.find(transactionQuery).lean();

        const transactionBatchSize = 500;
        const totalBatches = totalUserTransactions.length / transactionBatchSize;

        log(`totalUserTransactions ${totalUserTransactions.length}`);
        log(`totalBatches ${totalBatches}`);

        // need to batch updates for Mongo connection to persist
        for (let batchCount = 0; batchCount < totalBatches; batchCount += 1) {
          // connecting to DB again in each batch
          // Mongo disconnects after around 2m and grabbing one transaction from the DB in each iteration seems to avoid this issue
          await TransactionModel.findOne({ _id: totalUserTransactions[batchCount * transactionBatchSize]._id });

          const allUserTransactions = totalUserTransactions.slice(batchCount * transactionBatchSize, (batchCount + 1) * transactionBatchSize);

          log(`transaction start ${allUserTransactions[0]._id} end ${allUserTransactions[allUserTransactions.length - 1]._id}`);

          const matchedTransactions: IMatchedTransaction[] = [];

          let remainingTransactions: CombinedPartialTransaction[] = [];

          // mappers will be different for each source
          if (transactionSource === TransactionSource.Plaid) {
            remainingTransactions = allUserTransactions.reduce((acc: CombinedPartialTransaction[], t) => {
              if (t.integrations.plaid) acc.push({ datetime: t.date.toDateString(), amount: t.amount, ...t.integrations.plaid } as any as CombinedPartialTransaction);
              return acc;
            }, [] as Transaction[]);
          }

          if (transactionSource === TransactionSource.Marqeta) {
            remainingTransactions = allUserTransactions.reduce((acc: CombinedPartialTransaction[], t) => {
            // potential for fp or fn here due to the merchant_name and name issues from plaid
              if (t.integrations.marqeta && t.integrations.marqeta?.card_acceptor?.name) acc.push({ merchant_name: t.integrations.marqeta?.card_acceptor?.name, name: t.integrations.marqeta?.card_acceptor?.name, ...t.integrations.marqeta } as CombinedPartialTransaction);
              return acc;
            }, []);
          }

          const timeString = `${logId}matching for user ${user._id.toString()}`;
          console.time(timeString);

          log(`initial transaction count ${remainingTransactions.length}`);

          // filter out pending transactions
          // where we could filter via sector/plaid category
          if (transactionSource === TransactionSource.Plaid) {
            remainingTransactions = remainingTransactions.filter((t) => !t?.pending);
            log(`initial transaction count after pending ${remainingTransactions.length}`);
          }

          // filter out false positives
          const foundFalsePositives: CombinedPartialTransaction[] = [];
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
          // maybe call getCleanCompanies here to hit DB again cleanedCompanies: await getCleanCompanies(),
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

          if (transactionSource === TransactionSource.Plaid) await updatePlaidTransactions(allUserTransactions as ITransaction[], newlyMatchedTransactions);
          if (transactionSource === TransactionSource.Marqeta) await updateMarqetaTransactions(allUserTransactions as ITransaction[], newlyMatchedTransactions);
        }
        // end of user loop
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
