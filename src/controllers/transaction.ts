import aqp from 'api-query-params';
import * as output from '../services/output';
import { asCustomError } from '../lib/customError';
import * as TransactionService from '../services/transaction';
import { IRequest, IRequestHandler } from '../types/request';
import { ITransactionDocument } from '../models/transaction';

export const getTransactions: IRequestHandler = async (req, res) => {
  try {
    const query = aqp(req.query, { skipKey: 'page' });
    const transactions = await TransactionService.getTransactions(req as IRequest<{}, TransactionService.ITransactionsRequestQuery>, query);
    const sharableTransactions = {
      ...transactions,
      docs: transactions.docs.map((t: ITransactionDocument) => TransactionService.getShareableTransaction(t)),
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
      transactions: transactions.map(t => TransactionService.getShareableTransaction(t)),
    };
    output.api(req, res, carbonOffsetTransactions);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getMostRecentTransactions: IRequestHandler = async (req, res) => {
  try {
    const mostRecentTransactions = await TransactionService.getMostRecentTransactions(req);
    output.api(req, res, mostRecentTransactions.map(t => TransactionService.getShareableTransaction(t)));
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const hasTransactions: IRequestHandler<{}, TransactionService.ITransactionsRequestQuery> = async (req, res) => {
  try {
    const userHasTransactions = await TransactionService.hasTransactions(req);
    output.api(req, res, { hasTransactions: userHasTransactions });
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
