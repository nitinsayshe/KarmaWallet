import { IMarqetaCardTransition, IMarqetaCreateCard } from '../../../integrations/marqeta/types';
import { verifyRequiredFields } from '../../../lib/requestData';
import { IRequestHandler } from '../../../types/request';
import * as output from '../../../services/output';
import CustomError, { asCustomError } from '../../../lib/customError';
import * as CardService from '../../../integrations/marqeta/card';
import { ErrorTypes } from '../../../lib/constants';
import { mapMarqetaCardtoCard } from '../../../services/card';

export const createCard: IRequestHandler<{}, {}, IMarqetaCreateCard> = async (req, res) => {
  try {
    const { body } = req;
    const { _id: _userId } = req.requestor;
    const requiredFields = ['cardProductToken'];
    const { isValid, missingFields } = verifyRequiredFields(requiredFields, body);
    if (!isValid) {
      output.error(req, res, new CustomError(`Invalid input. Body requires the following fields: ${missingFields.join(', ')}.`, ErrorTypes.INVALID_ARG));
      return;
    }
    const { user: data } = await CardService.createCard(body);
    await mapMarqetaCardtoCard(_userId, data);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const listCards: IRequestHandler<{ userToken: string }, {}, {}> = async (req, res) => {
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
    const requiredFields = ['cardToken', 'channel', 'state', 'reasonCode'];
    const { isValid, missingFields } = verifyRequiredFields(requiredFields, body);
    if (!isValid) {
      output.error(req, res, new CustomError(`Invalid input. Body requires the following fields: ${missingFields.join(', ')}.`, ErrorTypes.INVALID_ARG));
      return;
    }
    const { user: data } = await CardService.cardTransition(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getCardDetails: IRequestHandler<{ cardToken: string }, {}, {}> = async (req, res) => {
  try {
    const { data } = await CardService.getCardDetails(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
