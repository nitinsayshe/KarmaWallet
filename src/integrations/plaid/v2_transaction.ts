/* eslint-disable no-restricted-syntax */
import dayjs from 'dayjs';
import { ObjectId } from 'mongoose';
import { IUser, IUserDocument, UserModel } from '../../models/user';
import { ITransaction, ITransactionDocument, TransactionModel } from '../../models/transaction';
import { IMatchedTransaction } from './types';
import { CardModel } from '../../models/card';

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

export const getTransactionSector = (transaction: IMatchedTransaction, primarySectorDictionary: any, plaidMappingSectorDictionary: any) => {
  if (transaction.company) {
    const sector = primarySectorDictionary[transaction.company.toString()];
    if (sector) return sector;
  }
  // if there is no company, use the plaid category mapping to the sector
  const plaidCategoriesId = transaction?.category.map(x => x.trim().split(' ').join('-')).filter(x => !!x).join('-');
  const plaidCategory = plaidMappingSectorDictionary[plaidCategoriesId];
  if (plaidCategory) return plaidCategory.sector;
};

export const mapPlaidTransactionToKarmaTransaction = (
  plaidTransaction: IMatchedTransaction,
  userId: ObjectId | string,
  cards: ICardsDictionary,
  primarySectorDictionary: any,
  plaidMappingSectorDictionary: any,
) => {
  const transaction = new TransactionModel({
    user: userId,
    date: getTransactionDate(plaidTransaction.date),
    integrations: {
      plaid: plaidTransaction,
    },
    sector: getTransactionSector(plaidTransaction, primarySectorDictionary, plaidMappingSectorDictionary),
    amount: plaidTransaction.amount,
    card: cards[plaidTransaction.account_id],
  });
  if (plaidTransaction.company) transaction.company = plaidTransaction.company;
  return transaction;
};

export const filterDuplicatePlaidTransactions = async (transactions: ITransactionDocument[], user: IUserDocument) => {
  const { amounts, dates } = transactions.reduce((acc, t) => {
    acc.amounts.push(t.amount);
    acc.dates.push(t.date);
    return acc;
  }, { amounts: [], dates: [] });

  const userTransactions = await TransactionModel.find(
    {
      $and: [
        { user: user._id },
        { $or: [
          {
            amount: { $in: amounts } },
          {
            date: { $in: dates },
          },
        ],
        },
      ],
    },
  )
    .lean();

  console.log(`userTransactions: ${userTransactions.length}`);

  const uniqueTransactions = transactions.filter((t) => {
    const exists = userTransactions.find((ut) => {
      // TRANSACTION FINGERPRINTING
      // writing fingerprinting out to make it easier to debug
      const fingerprints = [];

      const amountFingerprint = ut.amount === t.amount;
      fingerprints.push(amountFingerprint);

      const dateFingerprint = ut.date.getTime() === t.date.getTime();
      fingerprints.push(dateFingerprint);

      const cardFingerprint = ut.card.toString() === t.card.toString();
      fingerprints.push(cardFingerprint);

      const companyFingerprint = ut.company?.toString() === t.company?.toString();
      fingerprints.push(companyFingerprint);

      const nameMatch = ut.integrations.plaid.name === t.integrations.plaid.name;
      const merchantMatch = ut.integrations.plaid.merchant_name === t.integrations.plaid.merchant_name;
      const nameFingerprint = nameMatch || merchantMatch;
      fingerprints.push(nameFingerprint);

      return fingerprints.every(x => x);
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
) => {
  const _user = await UserModel.findOne({ _id: user });
  const cards = await CardModel.find({ status: 'linked', userId: _user._id });
  const cardDictionary = cards.reduce((acc, card) => {
    // @ts-ignore
    acc[card.integrations.plaid.accountId] = card._id;
    return acc;
  }, {});
  if (!_user) return;
  console.log(`transaction count: ${transactions.length}`);
  console.log('saving transactions');
  const mappedTransactions = transactions.map((t) => mapPlaidTransactionToKarmaTransaction(t, _user._id.toString(), cardDictionary, primarySectorDictionary, plaidMappingSectorDictionary));
  const transactionsToSave = await filterDuplicatePlaidTransactions(mappedTransactions, _user);
  console.log(`mapped transaction count: ${mappedTransactions.length}`);
  console.log(`transactions to save count: ${transactionsToSave.length}`);
  // await TransactionModel.insertMany(mappedTransactions);
};

export interface IPlaidIdTransactionDictionary {
  [key: string]: ITransactionDocument;
}

export const updateTransactions = async (transactions: ITransaction[], remainingTransactions: IMatchedTransaction[]) => {
  await TransactionModel.updateMany({ 'integrations.plaid.transaction_id': { $in: remainingTransactions.map(x => x.transaction_id) } }, { $set: { company: null } });
  console.log('updating transactions');
  console.log(`transaction count: ${transactions.length}`);
  console.log(`remaining transaction count: ${remainingTransactions.length}`);
  const transactionsToSave: any = [];
  const plaidIdTransactionDictionary: IPlaidIdTransactionDictionary = transactions.reduce((acc, t) => {
    // @ts-ignore
    acc[t.integrations.plaid.transaction_id] = t;
    return acc;
  }, {});
  console.time('transactions comparison');
  for (const remainingTransaction of remainingTransactions) {
    const transaction = plaidIdTransactionDictionary[remainingTransaction.transaction_id];
    if (!transaction) continue;
    transaction.integrations.plaid = remainingTransaction;
    if ((transaction.company?.toString() === remainingTransaction.company?.toString()) || (!transaction.company && !remainingTransaction.company)) continue;
    console.log(`updating transaction ${transaction._id} company from ${transaction.company} to ${remainingTransaction.company}`);

    transactionsToSave.push(TransactionModel.findOneAndUpdate({ _id: transaction._id }, { company: remainingTransaction.company }, { new: true }));
  }
  console.log(`transactions to save count: ${transactionsToSave.length}`);
  await Promise.all(transactionsToSave);
  console.timeEnd('transactions comparison');
};
