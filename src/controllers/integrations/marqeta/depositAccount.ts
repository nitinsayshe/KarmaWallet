import { IMarqetaUserToken } from '../../../integrations/marqeta/types';
import { IRequestHandler } from '../../../types/request';
import * as output from '../../../services/output';
import { asCustomError } from '../../../lib/customError';
import * as DepositAccountService from '../../../integrations/marqeta/depositAccount';

export const createDepositAccount: IRequestHandler<{ userToken: string }, {}, IMarqetaUserToken> = async (req, res) => {
  try {
    const { user: data } = await DepositAccountService.createDepositAccount(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const listDepositAccount: IRequestHandler<{ userToken: string }, {}, {}> = async (req, res) => {
  try {
    const { userToken } = req.params;
    const { user: data } = await DepositAccountService.listDepositAccount(userToken);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
