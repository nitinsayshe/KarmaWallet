/* eslint-disable no-restricted-syntax */
import fs from 'fs';
import dayjs from 'dayjs';
import { FilterQuery, ObjectId, Types } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { IUser, IUserDocument, UserModel } from '../../models/user';
import { ITransaction, ITransactionDocument, TransactionModel } from '../../models/transaction';
import { IMatchedTransaction } from './types';
import { CardModel, ICard, ICardDocument } from '../../models/card';
import { TransactionStatus } from '../../clients/kard';
import { queueSettledTransactions } from '../kard';
import { KardEnrollmentStatus } from '../../lib/constants';

export interface ICardsDictionary {
  [key: string]: ObjectId;
}

export const getTransactionDate = (date: string) => {
  let _date = dayjs('1970-01-01T00:00:00.000+00:00').utc();
  const parsedDate = date.split('-');
  _date = _date.set('year', parseInt(parsedDate[0]));
  _date = _date.set('month', parseInt(parsedDate[1]) - 1);
  _date = _date.set('date', parseInt(parsedDate[2]));
  return _date.toDate();
};

export const getTransactionSector = (
  transaction: IMatchedTransaction,
  primarySectorDictionary: any,
  plaidMappingSectorDictionary: any,
) => {
  if (transaction.company) {
    const sector = primarySectorDictionary[transaction.company.toString()];
    if (sector) return sector;
  }
  // if there is no company, use the plaid category mapping to the sector
  if (!transaction?.category?.length) return;
  const plaidCategoriesId = transaction?.category
    .map((x) => x.trim().split(' ').join('-'))
    .filter((x) => !!x)
    .join('-');
  const plaidCategory = plaidMappingSectorDictionary[plaidCategoriesId];
  if (plaidCategory) return plaidCategory.sector;
};

export const mapPlaidTransactionToKarmaTransaction = (
  plaidTransaction: IMatchedTransaction,
  userId: ObjectId | string,
  cards: ICardsDictionary,
  primarySectorDictionary: any,
  plaidMappingSectorDictionary: any,
  _card?: ICardDocument | ICard | string | ObjectId,
) => {
  const log = (message: string) => console.log(`[pmap] - ${message}`);
  let cardToAssign: ObjectId | ICard | string | ICardDocument = cards[plaidTransaction.account_id];
  if (!cardToAssign) {
    log(`card not found for plaid transaction ${plaidTransaction.transaction_id}`);
    cardToAssign = _card;
  }

  const transaction = new TransactionModel({
    user: userId,
    date: getTransactionDate(plaidTransaction.date),
    integrations: {
      plaid: plaidTransaction,
    },
    sector: getTransactionSector(plaidTransaction, primarySectorDictionary, plaidMappingSectorDictionary),
    amount: plaidTransaction.amount,
    card: cardToAssign,
  });
  if (plaidTransaction.company) transaction.company = plaidTransaction.company;
  return transaction;
};

export const filterDuplicatePlaidTransactions = async (transactions: ITransactionDocument[], user: IUserDocument) => {
  const { amounts, dates } = transactions.reduce(
    (acc, t) => {
      acc.amounts.push(t.amount);
      acc.dates.push(t.date);
      return acc;
    },
    { amounts: [], dates: [] },
  );

  const userTransactions = await TransactionModel.find({
    $and: [
      { 'integrations.plaid': { $ne: null } },
      { user: user._id },
      {
        $or: [
          {
            amount: { $in: amounts },
          },
          {
            date: { $in: dates },
          },
        ],
      },
    ],
  }).lean();

  const uniqueTransactions = transactions.filter((t) => {
    const exists = userTransactions.find((ut) => {
      // TRANSACTION FINGERPRINTING
      // writing fingerprinting out to make it easier to debug
      const fingerprints = [];

      const amountFingerprint = ut.amount === t.amount;
      fingerprints.push(amountFingerprint);

      const dateFingerprint = ut.date.getTime() === t.date.getTime();
      fingerprints.push(dateFingerprint);

      // removed to account for the same card being used for multiple accountIds
      // const cardFingerprint = ut.card.toString() === t.card.toString();
      // fingerprints.push(cardFingerprint);

      const companyFingerprint = ut.company?.toString() === t.company?.toString();
      fingerprints.push(companyFingerprint);

      const nameMatch = ut.integrations.plaid.name === t.integrations.plaid.name;
      const merchantMatch = ut.integrations.plaid.merchant_name === t.integrations.plaid.merchant_name;
      const nameFingerprint = nameMatch || merchantMatch;
      fingerprints.push(nameFingerprint);

      return fingerprints.every((x) => x);
    });
    return !exists;
  });

  return uniqueTransactions;
};

export const saveTransactions = async (
  transactions: IMatchedTransaction[],
  user: IUser | IUserDocument | string,
  primarySectorDictionary: any,
  plaidMappingSectorDictionary: any,
  _card?: ICardDocument | string | ObjectId | ICard,
) => {
  const logId = '[pstr] - ';
  const log = (message: string) => console.log(`${logId}${message}`);
  const _user = await UserModel.findOne({ _id: user });
  if (!_user?._id) {
    log(`user not found for id ${user}`);
  }
  const cards = await CardModel.find({ status: 'linked', userId: _user._id });
  const cardDictionary = cards.reduce((acc, card) => {
    // short circuit if card is not linked to plaid (i.e. marqeta card)
    if (!card.integrations?.plaid?.accountId) return acc;
    // @ts-ignore
    acc[card.integrations.plaid.accountId] = card._id;
    return acc;
  }, {});
  if (!_user) return;
  log(`transaction count: ${transactions.length}`);
  log('saving transactions');
  const mappedTransactions = transactions.map((t) => mapPlaidTransactionToKarmaTransaction(
    t,
    _user._id.toString(),
    cardDictionary,
    primarySectorDictionary,
    plaidMappingSectorDictionary,
    _card,
  ));
  let transactionsToSave = await filterDuplicatePlaidTransactions(mappedTransactions, _user);

  // assign Transactions a transaction id for kard
  // store the status of the transaction
  transactionsToSave = transactionsToSave.map((t) => {
    t.card = cards.find((c) => c._id?.toString() === t.card?.toString());
    const status = t?.integrations?.plaid?.pending ? TransactionStatus.APPROVED : TransactionStatus.SETTLED;
    const card = t.card as ICard;
    if (
      !!card?.integrations?.kard?.enrollmentStatus
      && card.integrations.kard.enrollmentStatus === KardEnrollmentStatus.Enrolled
    ) {
      if (!t.integrations) t.integrations = {};
      if (!t.integrations.kard) {
        t.integrations.kard = {
          id: uuid(),
          status,
        };
      } else if (status !== t.integrations.kard.status) {
        t.integrations.kard.status = status;
      }
    }
    return t;
  });

  // send positive amount, non-pending, reward-program-registered card-related transactions to kard
  const kardSyncTransactions = transactionsToSave
    .filter(
      (t) => t.amount >= 0 && !t?.integrations?.plaid?.pending && !!(t?.card as ICard)?.integrations?.kard?.createdOn,
    )
    .reduce((acc, curr) => {
      const cardId = (curr.card as ICardDocument)?._id.toString();
      if (!cardId) return acc;
      if (!acc[cardId]) acc[cardId] = [];
      acc[cardId].push(curr);
      return acc;
    }, {} as { [key: string]: ITransactionDocument[] });

  for (const cardId of Object.keys(kardSyncTransactions)) {
    await queueSettledTransactions(new Types.ObjectId(cardId), kardSyncTransactions[cardId]);
  }

  log(`mapped transaction count: ${mappedTransactions.length}`);
  log(`transactions to save count: ${transactionsToSave.length}`);
  await TransactionModel.insertMany(transactionsToSave);
};

export interface IPlaidIdTransactionDictionary {
  [key: string]: ITransactionDocument;
}

export const updateTransactions = async (
  allUserTransactions: ITransaction[],
  newlyMatchedTransactions: IMatchedTransaction[],
) => {
  const logId = '[updt] - ';
  const log = (message: string) => console.log(`${logId}${message}`);

  log('updating transactions');
  log(`transaction count: ${allUserTransactions.length}`);
  log(`remaining transaction count: ${newlyMatchedTransactions.length}`);

  const transactionsToSave: any = [];

  const plaidIdTransactionDictionary: IPlaidIdTransactionDictionary = allUserTransactions.reduce(
    (acc: { [key: string]: ITransactionDocument }, t) => {
      acc[t.integrations.plaid.transaction_id] = t as ITransactionDocument;
      return acc;
    },
    {},
  );

  const timeString = `${logId}transactions comparison`;
  console.time(timeString);

  for (const newlyMatchedTransaction of newlyMatchedTransactions) {
    const transaction = plaidIdTransactionDictionary[newlyMatchedTransaction.transaction_id];
    if (!transaction) continue;
    transaction.integrations.plaid = newlyMatchedTransaction;
    if (
      transaction.company?.toString() === newlyMatchedTransaction.company?.toString()
      || (!transaction.company && !newlyMatchedTransaction.company)
    ) {
      continue;
    }
    log(
      `updating transaction ${transaction._id} company from ${transaction.company} to ${newlyMatchedTransaction.company}`,
    );

    transactionsToSave.push(
      TransactionModel.findOneAndUpdate(
        { _id: transaction._id },
        { company: newlyMatchedTransaction.company },
        { new: true },
      ),
    );
  }

  log(`transactions to save count: ${transactionsToSave.length}`);
  await Promise.all(transactionsToSave);
  console.timeEnd(timeString);
};

export interface IDuplicatePlaidTransactionDictionary {
  [key: string]: ITransactionDocument[];
}

export interface ICleanDuplicateTransactions {
  userQuery: FilterQuery<IUserDocument>;
  removeDuplicates?: boolean;
  writeToDisk?: boolean;
}

export const identifyAndRemoveDuplicateTransactions = async ({
  userQuery,
  removeDuplicates = false,
  writeToDisk = false,
}: ICleanDuplicateTransactions) => {
  const duplicates: IDuplicatePlaidTransactionDictionary = {};
  const users = await UserModel.find(userQuery);
  for (const user of users) {
    const _duplicateMatches: string[] = [];
    const _duplicates: ITransactionDocument[] = [];
    const transactions = await TransactionModel.find({ user: user._id, 'integrations.plaid': { $ne: null } });

    // let i = 0;
    for (const transaction of transactions) {
      // i += 1;
      const transactionsWithSameAmount = await TransactionModel.find({
        user: user._id,
        amount: transaction.amount,
        'integrations.plaid': { $ne: null },
      });

      // console.log(`[i] user ${user._id} transaction ${i} of ${transactions.length}`);

      if (_duplicateMatches.indexOf(transaction._id.toString()) > -1) {
        // console.log(`[i] skipping ${transaction._id} because it's already been matched`);
        continue;
      }

      const duplicate = transactionsWithSameAmount.find((t) => {
        if (_duplicateMatches.find((d) => d === t._id.toString())) return false;
        if (_duplicates.find((d) => d._id.toString() === t._id.toString())) return false;
        if (t._id.toString() === transaction._id.toString()) return false;
        if (t.integrations.plaid.transaction_id === transaction.integrations.plaid.transaction_id) return true;
        const fingerprints = [];

        const amountFingerprint = t.amount === transaction.amount;
        fingerprints.push(amountFingerprint);

        const dateFingerprint = t.date.getTime() === transaction.date.getTime();
        fingerprints.push(dateFingerprint);

        // const cardFingerprint = t.card.toString() === transaction.card.toString();
        // fingerprints.push(cardFingerprint);

        const companyFingerprint = t.company?.toString() === transaction.company?.toString();
        fingerprints.push(companyFingerprint);

        const nameMatch = t.integrations.plaid.name === transaction.integrations.plaid.name;
        const merchantMatch = t.integrations.plaid.merchant_name === transaction.integrations.plaid.merchant_name;
        const nameFingerprint = nameMatch || merchantMatch;
        fingerprints.push(nameFingerprint);

        return fingerprints.every((x) => x);
      });

      if (duplicate) {
        // console.log(`[i] found duplicate ${transaction._id} for ${duplicate._id}`);
        _duplicates.push(duplicate);
        _duplicateMatches.push(transaction._id.toString());
      }
    }
    if (_duplicates.length) duplicates[user._id.toString()] = _duplicates.map((d) => d._id.toString());
    console.log(`[i] user ${user._id} has ${_duplicates.length} duplicates`);
    if (removeDuplicates && _duplicates.length > 0) {
      const duplicateIds = _duplicates.map((d) => d._id);
      const d = await TransactionModel.deleteMany({ user, _id: { $in: duplicateIds } });
      console.log(`[-] deleted ${d.deletedCount} duplicates for user ${user._id}`);
    }
  }
  if (writeToDisk) fs.writeFileSync('./duplicates.json', JSON.stringify(duplicates));
  return duplicates;
};
