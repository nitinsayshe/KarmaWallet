import { IMarqetaCreateGPAorder } from '../../../integrations/marqeta/types';
import { verifyRequiredFields } from '../../../lib/requestData';
import { IRequestHandler } from '../../../types/request';
import * as output from '../../../services/output';
import CustomError, { asCustomError } from '../../../lib/customError';
import * as GPAService from '../../../integrations/marqeta/gpa';
import { ErrorTypes } from '../../../lib/constants';

export const fundUserGPA: IRequestHandler<{}, {}, IMarqetaCreateGPAorder> = async (req, res) => {
  try {
    const { body } = req;
    const { userToken } = req.requestor.integrations.marqeta;
    const params = { userToken, ...body };

    const requiredFields = ['amount', 'currencyCode', 'fundingSourceToken'];
    const { isValid, missingFields } = verifyRequiredFields(requiredFields, body);
    if (!isValid) {
      output.error(req, res, new CustomError(`Invalid input. Body requires the following fields: ${missingFields.join(', ')}.`, ErrorTypes.INVALID_ARG));
      return;
    }
    const data = await GPAService.createGPAorder(params);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getGPAbalance: IRequestHandler<{}, {}, IMarqetaCreateGPAorder> = async (req, res) => {
  try {
    const { userToken } = req.requestor.integrations.marqeta;
    const { user: data } = await GPAService.getGPABalance(userToken);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
