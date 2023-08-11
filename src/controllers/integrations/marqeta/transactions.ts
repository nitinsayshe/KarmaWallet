import { IRequestHandler } from '../../../types/request';
import * as output from '../../../services/output';
import { asCustomError } from '../../../lib/customError';
import * as TransactionService from '../../../integrations/marqeta/transactions';
import { IMarqetaMakeTransaction, IMarqetaMakeTransactionAdvice, IMarqetaMakeTransactionClearing } from '../../../integrations/marqeta/types';

export const makeTransaction: IRequestHandler<{}, {}, IMarqetaMakeTransaction> = async (req, res) => {
  try {
    const { data } = await TransactionService.makeTransaction(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const makeTransactionAdvice: IRequestHandler<{}, {}, IMarqetaMakeTransactionAdvice> = async (req, res) => {
  try {
    const { data } = await TransactionService.makeTransactionAdvice(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const makeTransactionClearing: IRequestHandler<{}, {}, IMarqetaMakeTransactionClearing> = async (req, res) => {
  try {
    const { data } = await TransactionService.makeTransactionClearing(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const listTransaction: IRequestHandler<{}, {cardToken:string, userToken:string}, {}> = async (req, res) => {
  try {
    const { data } = await TransactionService.listTransaction(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
