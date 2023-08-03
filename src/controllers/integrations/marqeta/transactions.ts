import { IRequestHandler } from '../../../types/request';
import * as output from '../../../services/output';
import { asCustomError } from '../../../lib/customError';
import * as TransactionService from '../../../integrations/marqeta/transactions';

export const listTransaction: IRequestHandler<{}, {cardToken:string, userToken:string}, {}> = async (req, res) => {
  try {
    const { data } = await TransactionService.listTransaction(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
