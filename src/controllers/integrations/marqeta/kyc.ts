import { IMarqetaProcessKyc } from '../../../integrations/marqeta/types';
import { IRequestHandler } from '../../../types/request';
import * as output from '../../../services/output';
import { asCustomError } from '../../../lib/customError';
import * as KYCService from '../../../integrations/marqeta/kyc';

export const processUserKyc: IRequestHandler<{ userToken: string }, {}, IMarqetaProcessKyc> = async (req, res) => {
  try {
    const { userToken } = req.params;
    const { user: data } = await KYCService.processUserKyc(userToken);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const listUserKyc: IRequestHandler<{ userToken: string }, {}, {}> = async (req, res) => {
  try {
    const { userToken } = req.params;
    const { data } = await KYCService.listUserKyc(userToken);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getKycResult: IRequestHandler<{ kycToken: string }, {}, {}> = async (req, res) => {
  try {
    const { user: data } = await KYCService.getKycResult(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
