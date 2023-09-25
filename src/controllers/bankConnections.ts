import { IRequestHandler } from '../types/request';
import * as BankConnectionService from '../services/bankConnection';
import * as output from '../services/output';
import { asCustomError } from '../lib/customError';

export const getBankConnections: IRequestHandler = async (req, res) => {
  try {
    const banks = await BankConnectionService.getBankConnections(req);
    output.api(
      req,
      res,
      banks.map((c) => BankConnectionService.getShareableBankConnections(c)),
    );
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
export const removeBankConnection:IRequestHandler<BankConnectionService.IRemoveBankParams, {}, {}> = async (
  req,
  res,
) => {
  try {
    const linkToken = await BankConnectionService.removeBankConnection(req);
    output.api(req, res, linkToken);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
