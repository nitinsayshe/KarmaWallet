import { IMarqetaUserToken } from '../../../integrations/marqeta/types';
import { IRequestHandler } from '../../../types/request';
import * as output from '../../../services/output';
import { asCustomError } from '../../../lib/customError';
import * as DepositAccountService from '../../../integrations/marqeta/depositAccount';

export const createDepositAccount: IRequestHandler<{}, {}, IMarqetaUserToken> = async (req, res) => {
  try {
    const { user: data } = await DepositAccountService.createDepositAccount(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const listDepositAccount: IRequestHandler<{}, {}, {}> = async (req, res) => {
  try {
    const { _id: userId } = req.requestor;
    const { user: data } = await DepositAccountService.listDepositAccount(userId);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
