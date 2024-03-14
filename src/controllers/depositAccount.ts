import { IMarqetaDepositAccount } from '../integrations/marqeta/types';
import { IRequestHandler } from '../types/request';
import * as output from '../services/output';
import { asCustomError } from '../lib/customError';
import * as DepositAccountService from '../services/depositAccount';

export const createDepositAccount: IRequestHandler<{}, {}, IMarqetaDepositAccount> = async (req, res) => {
  try {
    const data = await DepositAccountService.createDepositAccount(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getDepositAccount: IRequestHandler<{}, {}, IMarqetaDepositAccount> = async (req, res) => {
  try {
    const data = await DepositAccountService.getDepositAccount(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
