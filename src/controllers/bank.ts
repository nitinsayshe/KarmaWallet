import { IRequestHandler } from '../types/request';
import * as BankService from '../services/bank';
import * as output from '../services/output';
import { asCustomError } from '../lib/customError';

export const getBanks: IRequestHandler = async (req, res) => {
  try {
    const banks = await BankService.getBanks(req);
    output.api(
      req,
      res,
      banks.map((c) => BankService.getShareableBank(c)),
    );
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
