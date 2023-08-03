import { IMarqetaCreatePin, IMarqetaRevealPin } from '../../../integrations/marqeta/types';
import { verifyRequiredFields } from '../../../lib/requestData';
import { IRequestHandler } from '../../../types/request';
import * as output from '../../../services/output';
import CustomError, { asCustomError } from '../../../lib/customError';
import * as PinService from '../../../integrations/marqeta/pin';
import { ErrorTypes } from '../../../lib/constants';

export const setPin: IRequestHandler<{}, {}, IMarqetaCreatePin> = async (req, res) => {
  try {
    const { body } = req;
    const requiredFields = ['cardToken', 'pin', 'controltokenType'];
    const { isValid, missingFields } = verifyRequiredFields(requiredFields, body);
    if (!isValid) {
      output.error(req, res, new CustomError(`Invalid input. Body requires the following fields: ${missingFields.join(', ')}.`, ErrorTypes.INVALID_ARG));
      return;
    }
    const { data } = await PinService.setPin(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getPin: IRequestHandler<{}, {}, IMarqetaRevealPin> = async (req, res) => {
  try {
    const { body } = req;
    const requiredFields = ['cardToken', 'cardholderVerificationMethod', 'controltokenType'];
    const { isValid, missingFields } = verifyRequiredFields(requiredFields, body);
    if (!isValid) {
      output.error(req, res, new CustomError(`Invalid input. Body requires the following fields: ${missingFields.join(', ')}.`, ErrorTypes.INVALID_ARG));
      return;
    }
    const { data } = await PinService.getPin(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
