import * as output from '../services/output';
import { asCustomError } from '../lib/customError';
import * as Transaction from '../services/transaction';
import { IRequestHandler } from '../types/request';

export const getCarbonOffsetTransactions: IRequestHandler = async (req, res) => {
  try {
    const transactions = await Transaction.getCarbonOffsetTransactions(req);
    const carbonOffsetTransactions = {
      company: { companyName: 'Rare.org' },
      transactions: transactions.map(t => Transaction.getShareableTransaction(t)),
    };
    output.api(req, res, carbonOffsetTransactions);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
