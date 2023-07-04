import { IMarqetaCardTransition, IMarqetaCreateCard } from '../../../integrations/marqeta/types';
import { verifyRequiredFields } from '../../../lib/requestData';
import { IRequestHandler } from '../../../types/request';
import * as output from '../../../services/output';
import CustomError, { asCustomError } from '../../../lib/customError';
import * as CardService from '../../../integrations/marqeta/card';
import { ErrorTypes } from '../../../lib/constants';

export const createCard: IRequestHandler<{}, {}, IMarqetaCreateCard> = async (req, res) => {
  try {
    const { body } = req;
    const requiredFields = ['user_token', 'card_product_token'];
    const { isValid, missingFields } = verifyRequiredFields(requiredFields, body);
    if (!isValid) {
      output.error(req, res, new CustomError(`Invalid input. Body requires the following fields: ${missingFields.join(', ')}.`, ErrorTypes.INVALID_ARG));
      return;
    }
    const data = await CardService.createCard(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const listCards: IRequestHandler<{userToken:string}, {}, {}> = async (req, res) => {
  try {
    const { userToken } = req.params;
    const data = await CardService.listCards(userToken);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const cardTransition: IRequestHandler<{}, {}, IMarqetaCardTransition> = async (req, res) => {
  try {
    const { body } = req;
    const requiredFields = ['card_token', 'channel', 'state'];
    const { isValid, missingFields } = verifyRequiredFields(requiredFields, body);
    if (!isValid) {
      output.error(req, res, new CustomError(`Invalid input. Body requires the following fields: ${missingFields.join(', ')}.`, ErrorTypes.INVALID_ARG));
      return;
    }
    const data = await CardService.cardTransition(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
