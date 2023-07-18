import { IMarqetaProcessKyc } from '../../../integrations/marqeta/types';
import { verifyRequiredFields } from '../../../lib/requestData';
import { IRequestHandler } from '../../../types/request';
import * as output from '../../../services/output';
import CustomError, { asCustomError } from '../../../lib/customError';
import * as KYCService from '../../../integrations/marqeta/kyc';
import { ErrorTypes } from '../../../lib/constants';

export const processUserKyc: IRequestHandler<{}, {}, IMarqetaProcessKyc> = async (req, res) => {
  try {
    const { body } = req;
    const requiredFields = ['user_token'];
    const { isValid, missingFields } = verifyRequiredFields(requiredFields, body);
    if (!isValid) {
      output.error(req, res, new CustomError(`Invalid input. Body requires the following fields: ${missingFields.join(', ')}.`, ErrorTypes.INVALID_ARG));
      return;
    }
    const data = await KYCService.processUserKyc(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const listUserKyc: IRequestHandler<{userToken:string}, {}, {}> = async (req, res) => {
  try {
    const { userToken } = req.params;
    const data = await KYCService.listUserKyc(userToken);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
