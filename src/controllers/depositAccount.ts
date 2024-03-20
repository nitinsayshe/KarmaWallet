import { IRequestHandler } from '../types/request';
import * as DepositAccountService from '../services/depositAccount';
import { api, error } from '../services/output';
import { asCustomError } from '../lib/customError';

export const getDepositAccounts: IRequestHandler = async (req, res) => {
  try {
    const depositAccounts = await DepositAccountService.getDepositAccounts(req.requestor._id);
    api(req, res, depositAccounts);
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};

export const getActiveDepositAccount: IRequestHandler = async (req, res) => {
  try {
    const depositAccount = await DepositAccountService.getActiveDepositAccount(req.requestor._id);
    api(req, res, depositAccount);
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};
