import { IMarqetaProcessKyc } from '../../../integrations/marqeta/types';
import { IRequestHandler } from '../../../types/request';
import * as output from '../../../services/output';
import { asCustomError } from '../../../lib/customError';
import * as KYCService from '../../../integrations/marqeta/kyc';

export const processUserKyc: IRequestHandler<{ userToken: string }, {}, IMarqetaProcessKyc> = async (req, res) => {
  try {
    const { user: data } = await KYCService.processUserKyc(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const listUserKyc: IRequestHandler<{}, {}, {}> = async (req, res) => {
  try {
    const { _id: userId } = req.requestor;
    const { user: data } = await KYCService.listUserKyc(userId);
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
