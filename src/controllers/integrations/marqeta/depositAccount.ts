import { IMarqetaUserToken } from '../../../integrations/marqeta/types';
import { verifyRequiredFields } from '../../../lib/requestData';
import { IRequestHandler } from '../../../types/request';
import * as output from '../../../services/output';
import CustomError, { asCustomError } from '../../../lib/customError';
import * as DepositAccountService from '../../../integrations/marqeta/depositAccount';
import { ErrorTypes } from '../../../lib/constants';

export const createDepositAccount: IRequestHandler<{}, {}, IMarqetaUserToken> = async (req, res) => {
  try {
    const { body } = req;
    const requiredFields = ['user_token'];
    const { isValid, missingFields } = verifyRequiredFields(requiredFields, body);
    if (!isValid) {
      output.error(req, res, new CustomError(`Invalid input. Body requires the following fields: ${missingFields.join(', ')}.`, ErrorTypes.INVALID_ARG));
      return;
    }
    const data = await DepositAccountService.createDepositAccount(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const listDepositAccount: IRequestHandler<{userToken:string}, {}, {}> = async (req, res) => {
  try {
    const { userToken } = req.params;
    const data = await DepositAccountService.listDepositAccount(userToken);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
