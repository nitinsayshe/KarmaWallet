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

export const getKarmaCardStatement = async (req: IRequest<IKarmaCardStatementIdParam, {}, {}>) => {
  const { statementId } = req.params;

  const karmaCardStatement = await KarmaCardStatementModel.findOne({ _id: statementId });
  if (!karmaCardStatement) throw new CustomError(`A karma card statement with id ${statementId} was not found.`, ErrorTypes.NOT_FOUND);

  return karmaCardStatement;
};

export const getStatementData = (transactionsArray?: ITransaction[]) => {
  console.log('///// placeholder will have logic to get all of these properties generated');
  return {
    startDate: dayjs().subtract(1, 'month'),
    endDate: dayjs(),
    transactions: transactionsArray || [],
    endBalance: 7000.43,
    startBalance: 9000,
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
    transactionTotals: getStatementData(transactions),
    userId,
  });

  await generateKarmaCardStatementPDF(newStatement);
  // placeholder for testing, if generation fails we would also want to delete the statement maybe?
  await newStatement.delete();
};
