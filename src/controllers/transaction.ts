import aqp from 'api-query-params';
import * as output from '../services/output';
import { asCustomError } from '../lib/customError';
import * as TransactionService from '../services/transaction';
import * as TransactionTypes from '../services/transaction/types';
import { IRequest, IRequestHandler } from '../types/request';
import { ITransactionDocument } from '../models/transaction';

export const getTransaction: IRequestHandler<TransactionTypes.ITransactionIdParam> = async (req, res) => {
  try {
    const transactionData = await TransactionService.getTransaction(req);
    output.api(req, res, transactionData);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getTransactions: IRequestHandler = async (req, res) => {
  try {
    const query = aqp(req.query, { skipKey: 'page' });
    const transactions = await TransactionService.getTransactions(req as IRequest<{}, TransactionTypes.ITransactionsRequestQuery>, query);
    const sharableTransactions = {
      ...transactions,
      docs: await Promise.all(transactions.docs.map(async (t: ITransactionDocument) => TransactionService.getShareableTransaction(t))),
    };

    output.api(req, res, sharableTransactions);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getCarbonOffsetTransactions: IRequestHandler = async (req, res) => {
  try {
    const transactions = await TransactionService.getCarbonOffsetTransactions(req);
    const carbonOffsetTransactions = {
      company: { companyName: 'Rare.org' },
      transactions: await Promise.all(transactions.map(async (t) => TransactionService.getShareableTransaction(t))),
    };
    output.api(req, res, carbonOffsetTransactions);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getMostRecentTransactions: IRequestHandler = async (req, res) => {
  try {
    const mostRecentTransactions = await TransactionService.getMostRecentTransactions(req as IRequest<{}, TransactionTypes.IGetRecentTransactionsRequestQuery>);
    output.api(req, res, await Promise.all(mostRecentTransactions.map(t => TransactionService.getShareableTransaction(t))));
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getRatedTransactions: IRequestHandler = async (req, res) => {
  try {
    const transactions = await TransactionService.getRatedTransactions(req as IRequest<{}, TransactionTypes.ITransactionsRequestQuery>);

    const sharableTransactions = {
      ...transactions,
      docs: await Promise.all(transactions.docs.map((t: ITransactionDocument) => TransactionService.getShareableTransaction(t))),
    };

    output.api(req, res, sharableTransactions);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const hasTransactions: IRequestHandler<{}, TransactionTypes.ITransactionsRequestQuery> = async (req, res) => {
  try {
    const userHasTransactions = await TransactionService.hasTransactions(req);
    output.api(req, res, { hasTransactions: userHasTransactions });
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
