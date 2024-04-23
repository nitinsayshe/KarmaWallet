import { IRequestHandler } from '../../../types/request';
import * as output from '../../../services/output';
import { asCustomError } from '../../../lib/customError';
import * as DepositAccountService from '../../../integrations/marqeta/depositAccount';
import { IMarqetaDepositAccountTransition } from '../../../integrations/marqeta/types';
import { UserModel } from '../../../models/user';

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
    output.api(req, res, data);
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

export const createDepositAccountForUser: IRequestHandler<{ userId: string }, {}, {}> = async (req, res) => {
  try {
    const user = await UserModel.findById(req.params.userId);
    if (!user) throw new Error('User not found');
    const data = await DepositAccountService.createDepositAccount(user);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
