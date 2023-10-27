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
import { uploadPDF } from '../upload';

export const getKarmaCardStatement = async (req: IRequest<IKarmaCardStatementIdParam, {}, {}>) => {
  const { statementId } = req.params;

  const karmaCardStatement = await KarmaCardStatementModel.findOne({ _id: statementId });
  if (!karmaCardStatement) throw new CustomError(`A karma card statement with id ${statementId} was not found.`, ErrorTypes.NOT_FOUND);

  return karmaCardStatement;
};

export const getStatementData = async (transactionsArray: ITransaction[], userId: string) => {
  const hasTransactions = transactionsArray.length > 0;
  let endBalanceFromLastStatement = 0;
  let transactionsSortedByDate: ITransaction[] | [] = [];
  let endBalance = 0;
  let startBalance = 0;
  let debits = 0;
  let deposits = 0;
  let adjustments = 0;
  let cashback = 0;
  let credits = 0;

  if (!!hasTransactions) {
    transactionsSortedByDate = transactionsArray.sort((a, b) => (dayjs(a.date).isBefore(dayjs(b.date)) ? -1 : 1));
    endBalance = transactionsSortedByDate[transactionsSortedByDate.length - 1].integrations.marqeta.gpa.available_balance;
    startBalance = transactionsSortedByDate[0].integrations.marqeta.gpa.available_balance;
    /// / update these when we have Andy's PR
    debits = 187.52;
    deposits = 200;
    adjustments = 0;
    cashback = 20.45;
    credits = 40.23;
  } else {
    const statements = await KarmaCardStatementModel.find({ userId });
    const lastStatement = statements[statements.length - 1];
    endBalanceFromLastStatement = lastStatement?.transactionTotals?.endBalance;
    if (!statements.length) {
      endBalance = 0;
      startBalance = 0;
    } else {
      endBalance = endBalanceFromLastStatement;
      startBalance = endBalanceFromLastStatement;
    }
  }

  return {
    endBalance,
    startBalance,
    debits,
    deposits,
    adjustments,
    cashback,
    credits,
  };
};

export const generateKarmaCardStatement = async (userId: string, startDate: string, endDate: string) => {
  if (!userId) throw new CustomError('A user id is required.', ErrorTypes.INVALID_ARG);
  if (!startDate) throw new CustomError('A start date is required.', ErrorTypes.INVALID_ARG);
  if (!endDate) throw new CustomError('An end date is required.', ErrorTypes.INVALID_ARG);
  let statement;
  // throw error if already an existing statement for this user and time period
  const existingStatement = await KarmaCardStatementModel.findOne({
    userId,
    startDate,
    endDate,
  });

  const user = await UserModel.findById(userId);

  if (!!existingStatement) {
    statement = existingStatement;
  } else {
    const transactions = await TransactionModel.find({
      user: userId,
      date: {
        $gte: startDate,
        $lte: endDate,
      },
      'integrations.marqeta': { $exists: true },
    });

    const transactionTotals = await getStatementData(transactions, user._id.toString());

    statement = await KarmaCardStatementModel.create({
      transactions,
      startDate: dayjs(startDate),
      endDate: dayjs(endDate),
      transactionTotals,
      userId,
      pdf: '',
    });
  }

  const pdfDoc = await generateKarmaCardStatementPDF(statement);

  if (!!pdfDoc) {
    const s3Data = await uploadPDF(pdfDoc, statement._id.toString());
    statement.pdf = s3Data.filename;
  }

  // placeholder for testing, if generation fails we would also want to delete the statement maybe?
  await statement.save();
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
  const noDuplicateCardholders = [...new Set(cardholders)];

  for (const cardholder of noDuplicateCardholders) {
    console.log(`[+] Generating statement for user ${cardholder}`);
    await generateKarmaCardStatement(cardholder, firstDayOfLastMonth.toString(), lastDayofLastMonth.toString());
  }
};
