/* eslint-disable no-restricted-syntax */
import fs from 'fs';
import { parse } from 'json2csv';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { CardStatus } from '../../lib/constants';
import { CardModel } from '../../models/card';
import { PlaidClient } from '../../clients/plaid';
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
import { TransactionModel } from '../../models/transaction';
import { saveTransactions } from '../../integrations/plaid/v2_transaction';
import { UserModel } from '../../models/user';
import { CombinedPartialTransaction } from '../../types/transaction';

dayjs.extend(utc);

/*
TODO:
unmatched names could be saved along with a flag for company name changes.
if the last modified is within a certain time frame then we don't have to
search the names for matches
*/

const logId = '[gptm] - ';
const log = (message: string) => {
  console.log(`${logId}${message}`);
};
export interface IGlobalPlaidTransactionMappingParams {
  startDate: string;
  endDate: string;
  filterExistingTransactions?: boolean;
  writeOutput?: boolean;
  accessTokens?: string[];
}

export const globalPlaidTransactionMapping = async ({
  startDate,
  endDate,
  filterExistingTransactions = true,
  writeOutput = false,
  accessTokens = [],
}: IGlobalPlaidTransactionMappingParams) => {
  const overallTimeString = `${logId}global plaid transaction mapping for ${dayjs().toISOString()}`;
  console.time(overallTimeString);
  console.log('\n');
  log(`global plaid transaction mapping started for ${dayjs().toISOString()}`);
  // iterate over cards
  // grab transactions for each card

  const output: IMatchedTransaction[] = [];

  const cleanedCompanies = await getCleanCompanies();
  const primarySectorDictionary = await getCompanyPrimarySectorDictionary();
  const plaidMappingSectorDictionary = await getPlaidCategoryMappingDictionary();

  const plaidClient = new PlaidClient();

  // get false positives
  const falsePositives = await V2TransactionFalsePositiveModel.find({});
  // get manual matches
  const manualMatches = await V2TransactionManualMatchModel.find({});

  // pulling transactions for the access token gets all cards
  const aggSteps: any = [
    {
      $match: {
        'integrations.plaid': {
          $exists: true,
        },
        status: CardStatus.Linked,
      },
    },
    {
      $group: {
        _id: '$integrations.plaid.accessToken',
        user: {
          $first: '$userId',
        },
        cards: {
          $sum: 1,
        },
      },
    },
  ];

  // for supporting a specific set of access tokens (i.e. user initial link)
  if (accessTokens.length > 0) {
    aggSteps.unshift({
      $match: {
        'integrations.plaid.accessToken': {
          $in: accessTokens,
        },
      },
    });
  }

  const linkedCardsGroupedByAccessToken = await CardModel.aggregate(aggSteps);

  const savingPromises: Promise<void>[] = [];

  for (const card of linkedCardsGroupedByAccessToken) {
    // get already matched each time as it builds on itself
    const alreadyMatchedCompanies = await V2TransactionMatchedCompanyNameModel.find({});

    const matchedTransactions: IMatchedTransaction[] = [];
    let remainingTransactions: CombinedPartialTransaction[] = [];

    const user = await UserModel.findOne({ _id: card.user });
    if (!user) {
      log(`user not found for card ${card._id}`);
      continue;
    }

    const timeString = `${logId}matching for user ${card.user.toString()}`;
    console.time(timeString);

    if (user.isTestIdentity) {
      continue;
    }

    remainingTransactions = await plaidClient.getPlaidTransactions({
      start_date: startDate,
      end_date: endDate,
      access_token: card._id,
    });

    console.log('\n');
    log(`fetching latest transactions for user ${card.user.toString()}`);
    log(`initial transaction count ${remainingTransactions?.length || 0}`);
    if (!remainingTransactions?.length || remainingTransactions?.length === 0) {
      log(`no transactions found for user ${card.user.toString()}`);
      continue;
    }

    // filter out pending transactions
    remainingTransactions = remainingTransactions.filter((t) => !t.pending);
    log(`initial transaction count after pending ${remainingTransactions.length}`);

    // filter out existing transactions from plaidId
    if (filterExistingTransactions) {
      const ids = remainingTransactions.map((t) => t.transaction_id);
      const existingTransactions = await TransactionModel.find({ 'integrations.plaid.transaction_id': { $in: ids } }).select('integrations.plaid.transaction_id').lean();
      remainingTransactions = remainingTransactions.filter((t) => !existingTransactions.find((et) => et.integrations.plaid.transaction_id === t.transaction_id));
      log(`transaction count after existing filter ${remainingTransactions.length}`);
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
    const newMatches = await getMatchResults({ transactions: remainingTransactions, cleanedCompanies, saveMatches: true });
    const [__matchedTransactions, _nonMatchedTransactions] = matchTransactionsToCompanies(remainingTransactions, newMatches);

    remainingTransactions = _nonMatchedTransactions;
    matchedTransactions.push(...__matchedTransactions);

    log(`matchedTransactions ${matchedTransactions.length}`);
    log(`foundFalsePositives ${foundFalsePositives.length}`);
    log(`foundManualMatches ${foundManualMatches.length}`);
    log(`remainingTransactions ${remainingTransactions.length}`);
    console.timeEnd(timeString);
    const allTransactions = [...matchedTransactions, ...foundFalsePositives, ...foundManualMatches, ...remainingTransactions];
    if (writeOutput) output.push(...allTransactions);
    const defaultCard = await CardModel.findOne({ 'integrations.plaid.accessToken': card._id });
    const promise = saveTransactions(allTransactions, card.user, primarySectorDictionary, plaidMappingSectorDictionary, defaultCard);

    // update last transaction sync
    const cards = await CardModel.find({ 'integrations.plaid.accessToken': card._id, userId: card.user, status: CardStatus.Linked });
    for (const c of cards) {
      c.lastTransactionSync = dayjs().utc().toDate();
      await c.save();
    }
    savingPromises.push(promise);
  }
  if (writeOutput) {
    const str = JSON.stringify(output, null, 2);
    fs.writeFileSync('output.json', str);
    const _csv = await parse(str);
    fs.writeFileSync('output.csv', _csv);
  }
  await Promise.all(savingPromises);
  console.log('\n');
  console.timeEnd(overallTimeString);
  console.log('\n');
};
