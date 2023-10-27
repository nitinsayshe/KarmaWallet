/* eslint-disable new-cap */
/* eslint-disable camelcase */
import dayjs from 'dayjs';
import { ErrorTypes } from '../../lib/constants';
import CustomError from '../../lib/customError';
import { KarmaCardStatementModel } from '../../models/karmaCardStatement';
import { ITransaction, TransactionModel } from '../../models/transaction';
import { IRequest } from '../../types/request';
import { IKarmaCardStatementIdParam } from './types';
import { generateKarmaCardStatementPDF } from './buildStatementPDF';
import { UserModel } from '../../models/user';
import { CardModel } from '../../models/card';

export const getKarmaCardStatement = async (req: IRequest<IKarmaCardStatementIdParam, {}, {}>) => {
  const { statementId } = req.params;

  const karmaCardStatement = await KarmaCardStatementModel.findOne({ _id: statementId });
  if (!karmaCardStatement) throw new CustomError(`A karma card statement with id ${statementId} was not found.`, ErrorTypes.NOT_FOUND);

  return karmaCardStatement;
};

export const getStatementData = async (transactionsArray: ITransaction[], userId: string) => {
  console.log('////// here are the transactions and user id', {
    transactionsArray,
    userId,
  });
  const hasTransactions = transactionsArray.length > 0;

  let endBalanceFromLastStatement = 0;
  if (hasTransactions) {
    const statements = await KarmaCardStatementModel.find({ userId });
    if (statements.length === 0) return 0;
    const lastStatement = statements[statements.length - 1];
    endBalanceFromLastStatement = lastStatement.transactionTotals.endBalance;
  }
  const transactionsSortedByDate = transactionsArray.sort((a, b) => (dayjs(a.date).isBefore(dayjs(b.date)) ? -1 : 1));

  // get balance

  return {
    startDate: dayjs().subtract(1, 'month'),
    endDate: dayjs(),
    transactions: transactionsArray || [],
    endBalance: hasTransactions ? transactionsSortedByDate[transactionsSortedByDate.length - 1].integrations.marqeta.gpa.available_balance : endBalanceFromLastStatement,
    startBalance: hasTransactions ? transactionsSortedByDate[0].integrations.marqeta.gpa.available_balance : endBalanceFromLastStatement,
    deposits: 100,
    credits: 80,
    debits: 300,
    cashback: 20,
    adjustments: 0,
  };
};

export const generateKarmaCardStatement = async (userId: string, startDate: string, endDate: string) => {
  if (!userId) throw new CustomError('A user id is required.', ErrorTypes.INVALID_ARG);
  if (!startDate) throw new CustomError('A start date is required.', ErrorTypes.INVALID_ARG);
  if (!endDate) throw new CustomError('An end date is required.', ErrorTypes.INVALID_ARG);
  // throw error if already an existing statement for this user and time period
  const existingStatement = await KarmaCardStatementModel.findOne({
    userId,
    startDate,
    endDate,
  });

  const user = await UserModel.findById(userId);

  if (!!existingStatement) {
    throw new CustomError(`A karma card statement for user ${userId} already exists for the date range ${startDate} - ${endDate}.`, ErrorTypes.CONFLICT);
  }

  const transactions = await TransactionModel.find({
    user: userId,
    date: {
      $gte: startDate,
      $lte: endDate,
    },
    'integrations.marqeta': { $exists: true },
  });

  const transactionIds = transactions.map(t => t._id);

  const newStatement = await KarmaCardStatementModel.create({
    startDate: dayjs(startDate),
    endDate: dayjs(endDate),
    transactions: transactionIds,
    transactionTotals: getStatementData(transactions, user._id.toString()),
    userId,
    pdf: '',
  });

  await generateKarmaCardStatementPDF(newStatement);
  // placeholder for testing, if generation fails we would also want to delete the statement maybe?
  await newStatement.save();
};

// run on the first of each month
export const generateKarmaCardStatementsForAllUsers = async () => {
  const lastMonth = dayjs().utc().subtract(1, 'month');
  const firstDayOfLastMonth = lastMonth.startOf('month');
  const lastDayofLastMonth = lastMonth.endOf('month');

  const karmaCards = await CardModel.find({
    'integrations.marqeta': { $exists: true },
  });

  const cardholders = karmaCards.map(c => c.userId.toString());

  for (const cardholder of cardholders) {
    await generateKarmaCardStatement(cardholder, firstDayOfLastMonth.toString(), lastDayofLastMonth.toString());
  }
};
