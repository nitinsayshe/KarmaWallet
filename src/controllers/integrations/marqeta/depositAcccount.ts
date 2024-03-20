import { IRequestHandler } from '../../../types/request';
import * as output from '../../../services/output';
import { asCustomError } from '../../../lib/customError';
import * as DepositAccountService from '../../../integrations/marqeta/depositAccount';
import { IMarqetaDepositAccountTransition } from '../../../integrations/marqeta/types';

export const listDepositAccounts: IRequestHandler<{}, {}, {}> = async (req, res) => {
  try {
    const { _id: userId } = req.requestor;
    const data = await DepositAccountService.listDepositAccountsForUser(userId);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const transitionDepositAccount: IRequestHandler<{}, {}, IMarqetaDepositAccountTransition> = async (req, res) => {
  try {
    const data = await DepositAccountService.transitionDepositAccount(req);
    return data;
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getDepositAccountByToken: IRequestHandler<{ token: string }, {}, {}> = async (req, res) => {
  try {
    const data = await DepositAccountService.getDepositAccountByToken(req.params.token);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
