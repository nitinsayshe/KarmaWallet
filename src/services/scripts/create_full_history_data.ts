import fs from 'fs';
import path from 'path';
import { parse } from 'json2csv';
import dayjs from 'dayjs';
import { CardModel } from '../../models/card';
import { TransactionModel } from '../../models/transaction';
import { UserModel } from '../../models/user';

const format = 'YYYY-MM-DD';

export const createFullHistoryData = async () => {
  console.log('creating full history of data...');
  const users = await UserModel.find({});

  const userCounts: { [key: string]: number } = {};
  const cardCounts: { [key: string]: number } = {};
  const transactionCounts: { [key: string]: number } = {};
  const rareTransactionCounts: { [key: string]: number } = {};

  for (const user of users) {
    const joinDate = dayjs(user.dateJoined).format(format);

    userCounts[joinDate] = (userCounts[joinDate] || 0) + 1;

    const cards = await CardModel.find({ userId: user });
    const transactions = await TransactionModel.find({ $and: [{ user }, { 'integrations.rare': null }] });
    const rareTransactions = await TransactionModel.find({ $and: [{ user }, { 'integrations.rare': { $ne: null } }] });

    for (const card of cards) {
      const cardLinkDate = dayjs(card.createdOn).format(format);
      cardCounts[cardLinkDate] = (cardCounts[cardLinkDate] || 0) + 1;
    }

    for (const transaction of rareTransactions) {
      const transactionDate = dayjs(transaction.date).format(format);
      rareTransactionCounts[transactionDate] = (rareTransactionCounts[transactionDate] || 0) + 1;
    }

    for (const transaction of transactions) {
      const transactionDate = dayjs(transaction.date).format(format);
      transactionCounts[transactionDate] = (transactionCounts[transactionDate] || 0) + 1;
    }
  }

  const finalUserCounts: [string, number][] = [];
  const finalCardCounts: [string, number][] = [];
  const finalTransactionCounts: [string, number][] = [];
  const finalRareTransactionCounts: [string, number][] = [];
  let aggUserCount = 0;
  let aggCardCount = 0;
  let aggTransactionCount = 0;
  let aggRareTransactionCount = 0;

  Object.keys(userCounts)
    .sort((a, b) => dayjs(a).diff(dayjs(b)))
    .forEach(key => {
      aggUserCount += userCounts[key];
      finalUserCounts.push([key, aggUserCount]);
    });

  Object.keys(cardCounts)
    .sort((a, b) => dayjs(a).diff(dayjs(b)))
    .forEach(key => {
      aggCardCount += cardCounts[key];
      finalCardCounts.push([key, aggCardCount]);
    });

  Object.keys(transactionCounts)
    .sort((a, b) => dayjs(a).diff(dayjs(b)))
    .forEach(key => {
      aggTransactionCount += transactionCounts[key];
      finalTransactionCounts.push([key, aggTransactionCount]);
    });

  Object.keys(rareTransactionCounts)
    .sort((a, b) => dayjs(a).diff(dayjs(b)))
    .forEach(key => {
      aggRareTransactionCount += rareTransactionCounts[key];
      finalRareTransactionCounts.push([key, aggRareTransactionCount]);
    });

  const _userCSV = parse(finalUserCounts.map(f => ({ date: f[0], count: f[1] })));
  fs.writeFileSync(path.join(__dirname, '.tmp', 'full_user_count_history.csv'), _userCSV);

  const _cardCSV = parse(finalCardCounts.map(f => ({ date: f[0], count: f[1] })));
  fs.writeFileSync(path.join(__dirname, '.tmp', 'full_card_count_history.csv'), _cardCSV);

  const _transactionCSV = parse(finalTransactionCounts.map(f => ({ date: f[0], count: f[1] })));
  fs.writeFileSync(path.join(__dirname, '.tmp', 'full_transaction_count_history.csv'), _transactionCSV);

  const _rareTransactionCSV = parse(finalRareTransactionCounts.map(f => ({ date: f[0], count: f[1] })));
  fs.writeFileSync(path.join(__dirname, '.tmp', 'full_rare_transaction_count_history.csv'), _rareTransactionCSV);

  console.log('[+] full history of data created');
};
