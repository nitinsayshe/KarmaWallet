import { asCustomError } from '../../lib/customError';
import * as output from '../../services/output';
import { IRequestHandler } from '../../types/request';
import * as TransactionService from '../../services/transaction';
import * as TransactionTypes from '../../services/transaction/types';

export const enrichTransaction: IRequestHandler<{}, {}, TransactionTypes.EnrichTransactionRequest> = async (req, res) => {
  try {
    const result = await TransactionService.enrichTransaction(req);
    output.api(req, res, result);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
