import { api, error } from '../services/output';
import { ErrorTypes } from '../lib/constants';
import CustomError from '../lib/customError';
import * as Transaction from '../services/transaction';
import { IRequestHandler } from '../types/request';

export const getDonationTransactions: IRequestHandler = async (req, res) => {
  const isValid = true;
  if (!isValid) {
    error(req, res, new CustomError('Invalid input', ErrorTypes.INVALID_ARG));
    return;
  }
  const transactions = await Transaction.getDonationTransactions(req);
  const data = {
    company: { companyName: 'Rare.org' },
    transactions: transactions.map(t => Transaction.getShareableTransaction(t)),
  };
  api(req, res, data);
};
