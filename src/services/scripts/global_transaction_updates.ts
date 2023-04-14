/* eslint-disable no-debugger */
/* eslint-disable no-restricted-syntax */
import fs from 'fs';
import { parse } from 'json2csv';
import { Transaction } from 'plaid';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import {
  getCleanCompanies,
  getCompanyPrimarySectorDictionary,
  getMatchResults,
  getPlaidCategoryMappingDictionary,
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
}

export const globalTransactionUpdates = async ({
  writeOutput = false,
}: IGlobalTransactionUpdatesParams) => {
  const overallTimeString = `--- global plaid transaction mapping for ${dayjs().toISOString()} ---`;
  console.time(overallTimeString);
  console.log(`global plaid transaction mapping started for ${dayjs().toISOString()}`);
  // iterate over cards
  // grab transactions for each card

  const output: IMatchedTransaction[] = [];

  const cleanedCompanies = await getCleanCompanies();
  const primarySectorDictionary = await getCompanyPrimarySectorDictionary();
  const plaidMappingSectorDictionary = await getPlaidCategoryMappingDictionary();

  // get false positives
  const falsePositives = await V2TransactionFalsePositiveModel.find({});
  // get manual matches
  const manualMatches = await V2TransactionManualMatchModel.find({});

  // pulling transactions for the access token gets all cards
  const usersWithTransactions = await TransactionModel.aggregate([
    {
      $group: {
        _id: '$user',
        count: {
          $sum: 1,
        },
      },
    },
  ]);

  const savingPromises: Promise<void>[] = [];

  let count = 1;
  for (const user of usersWithTransactions) {
    console.log(`\n--- updating transactions for user ${user._id.toString()} ---\n--- ${count} out of ${usersWithTransactions.length} users ---`);
    count += 1;
    // get already matched each time as it builds on itself
    const alreadyMatchedCompanies = await V2TransactionMatchedCompanyNameModel.find({});

    const allUserTransactions = await TransactionModel.find({ user: '621e71e075b8d7d9ceb379d9', 'integrations.plaid': { $ne: null } }).lean();

    const matchedTransactions: IMatchedTransaction[] = [];

    let remainingTransactions: Transaction[] = [];

    remainingTransactions = allUserTransactions.map(t => ({ datetime: t.date, amount: t.amount, ...t.integrations.plaid }) as any as Transaction);

    const timeString = `--- matching for user ${user._id.toString()} ---`;
    console.time(timeString);

    console.log(`initial transaction count ${remainingTransactions.length}`);

    // filter out pending transactions
    remainingTransactions = remainingTransactions.filter((t) => !t.pending);
    console.log(`initial transaction count after pending ${remainingTransactions.length}`);

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

    console.log(`matchedTransactions ${matchedTransactions.length}`);
    console.log(`foundFalsePositives ${foundFalsePositives.length}`);
    console.log(`foundManualMatches ${foundManualMatches.length}`);
    console.log(`remainingTransactions ${remainingTransactions.length}`);
    console.timeEnd(timeString);
    const allTransactions = [...matchedTransactions, ...foundFalsePositives, ...foundManualMatches, ...remainingTransactions];
    if (writeOutput) output.push(...allTransactions);
    const promise = updateTransactions(allUserTransactions as ITransaction[], allTransactions);

    savingPromises.push(promise);
  }
  if (writeOutput) {
    const str = JSON.stringify(output, null, 2);
    fs.writeFileSync('output.json', str);
    const _csv = await parse(str);
    fs.writeFileSync('output.csv', _csv);
  }
  await Promise.all(savingPromises);
  console.timeEnd(overallTimeString);
};
