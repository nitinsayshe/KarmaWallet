import { IRequestHandler } from '../types/request';
import * as BankConnectionService from '../services/bankConnection';
import * as output from '../services/output';
import { asCustomError } from '../lib/customError';
import { IBankRequestBody } from '../models/bankConnection';

export const getBankConnections: IRequestHandler = async (req, res) => {
  try {
    const banks = await BankConnectionService.getBankConnections(req);
    const shareableBankConnections = banks.map((c) => BankConnectionService.getShareableBankConnections(c));
    const formattedBankConnection = BankConnectionService.getFormattedBankConnection(shareableBankConnections);
    output.api(
      req,
      res,
      formattedBankConnection,
    );
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
export const removeBankConnection: IRequestHandler<BankConnectionService.IRemoveBankParams, {}, IBankRequestBody> = async (
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
