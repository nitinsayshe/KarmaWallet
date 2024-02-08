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
import { uploadPDF } from '../upload';
import { AwsClient } from '../../clients/aws';
import { TransactionCreditSubtypeEnum, TransactionCreditSubtypeEnumValues, TransactionTypeEnum, TransactionTypeEnumValues } from '../../lib/constants/transaction';
import { TransactionModelStateEnum } from '../../clients/marqeta/types';

export const getKarmaCardStatement = async (req: IRequest<IKarmaCardStatementIdParam, {}, {}>) => {
  const { statementId } = req.params;

  const karmaCardStatement = await KarmaCardStatementModel.findOne({ _id: statementId });
  if (!karmaCardStatement) throw new CustomError(`A karma card statement with id ${statementId} was not found.`, ErrorTypes.NOT_FOUND);

  return karmaCardStatement;
};

export const getSumOfTransactionsByTransactionType = (transactionType: TransactionTypeEnumValues, transactions: ITransaction[]) => {
  const filteredTransactions = transactions.filter(t => t.type === transactionType);
  const sum = filteredTransactions.reduce((acc, curr) => acc + curr.amount, 0);
  return sum;
};

export const getSumOfTransactionsByTransactionSubType = (transactionSubType: TransactionCreditSubtypeEnumValues, transactions: ITransaction[]) => {
  const filteredTransactions = transactions.filter(t => t.subType === transactionSubType);
  const sum = filteredTransactions.reduce((acc, curr) => acc + curr.amount, 0);
  return sum;
};

export const getStartBalance = (transaction: ITransaction) => {
  if (!!transaction?.integrations?.marqeta?.relatedTransactions && !!transaction?.integrations?.marqeta?.relatedTransactions.length) {
    const sortByNewestFirst = transaction.integrations.marqeta.relatedTransactions.sort((a, b) => (dayjs(a.local_transaction_date).isBefore(dayjs(b.local_transaction_date)) ? 1 : -1));
    const mostRecentTransaction = sortByNewestFirst[0];
    return mostRecentTransaction.gpa.ledger_balance;
  }
  return transaction.integrations.marqeta.gpa.ledger_balance;
};

export const getEndBalance = (transaction: ITransaction) => {
  if (!!transaction?.integrations?.marqeta?.relatedTransactions && !!transaction?.integrations?.marqeta?.relatedTransactions.length) {
    const sortByNewestFirst = transaction.integrations.marqeta.relatedTransactions.sort((a, b) => (dayjs(a.local_transaction_date).isBefore(dayjs(b.local_transaction_date)) ? 1 : -1));
    const mostRecentTransaction = sortByNewestFirst[0];
    return mostRecentTransaction.gpa.ledger_balance;
  }
  return transaction.integrations.marqeta.gpa.ledger_balance;
};

export const getStatementData = async (transactionsArray: ITransaction[], userId: string) => {
  const hasTransactions = transactionsArray.length > 0;
  const previousStatements = await KarmaCardStatementModel.find({ userId });
  const isFirstStatement = previousStatements.length === 0;

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
    transactionsSortedByDate = transactionsArray.sort((a, b) => (dayjs(a.sortableDate).isBefore(dayjs(b.sortableDate)) ? -1 : 1));
    startBalance = !!isFirstStatement ? 0 : getStartBalance(transactionsSortedByDate[0]);
    endBalance = getEndBalance(transactionsSortedByDate[transactionsSortedByDate.length - 1]);
    const debitsTotal = getSumOfTransactionsByTransactionType(TransactionTypeEnum.Debit, transactionsSortedByDate);
    const depositsTotal = getSumOfTransactionsByTransactionType(TransactionTypeEnum.Deposit, transactionsSortedByDate);
    const adjustmentsTotal = getSumOfTransactionsByTransactionType(TransactionTypeEnum.Adjustment, transactionsSortedByDate);
    const cashbackTotal = getSumOfTransactionsByTransactionSubType(TransactionCreditSubtypeEnum.Cashback, transactionsSortedByDate);
    const creditTotal = getSumOfTransactionsByTransactionType(TransactionTypeEnum.Credit, transactionsSortedByDate) - cashbackTotal;

    debits = debitsTotal;
    deposits = depositsTotal;
    adjustments = adjustmentsTotal;
    cashback = cashbackTotal;
    credits = creditTotal;
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

    const filteredTransactions = transactions.filter((t => {
      if (t.status === TransactionModelStateEnum.Pending) {
        return false;
      }

      if (t.integrations.marqeta.state === 'DECLINED' || t.status === TransactionModelStateEnum.Declined) {
        return false;
      }

      if (t.amount === 0) return false;
      if (!!t?.settledDate && (dayjs(t.settledDate).utc() > dayjs(endDate).utc())) return false;
      return true;
    }));

    const transactionTotals = await getStatementData(filteredTransactions, user._id.toString());

    statement = await KarmaCardStatementModel.create({
      transactions: filteredTransactions,
      startDate: dayjs(startDate),
      endDate,
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

export const getKarmaCardStatementPDF = async (req: IRequest<IKarmaCardStatementIdParam, {}, {}>) => {
  const { statementId } = req.params;
  if (!statementId) {
    throw new CustomError('A statement id is required.', ErrorTypes.INVALID_ARG);
  }

  const statement = await KarmaCardStatementModel.findOne({ _id: statementId });

  if (!statement) {
    throw new CustomError(`A statement with id ${statementId} was not found.`, ErrorTypes.NOT_FOUND);
  }

  const awsClient = new AwsClient();
  const pdfStream = await awsClient.getS3ResourceStream(statement.pdf, 'karmacardstatements.karmawallet');
  return pdfStream;
};

export const getKarmaCardStatements = async (req: IRequest<{}, {}, {}>) => {
  const { requestor } = req;
  const userId = requestor._id;

  if (!userId) throw new CustomError('A user id is required.', ErrorTypes.INVALID_ARG);
  const karmaCardStatements = await KarmaCardStatementModel.find({
    userId,
  });

  karmaCardStatements.map(statement => ({
    _id: statement._id,
    startDate: statement.startDate,
    endDate: statement.endDate,
    pdf: statement.pdf,
  }));

  return karmaCardStatements;
};
