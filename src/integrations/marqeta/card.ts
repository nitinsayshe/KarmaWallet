/* eslint-disable camelcase */
import { Card } from '../../clients/marqeta/card';
import { MarqetaClient } from '../../clients/marqeta/marqetaClient';
import { IRequest } from '../../types/request';
import { IMarqetaCardTransition, IMarqetaCreateCard } from './types';
// Instantiate the MarqetaClient
const marqetaClient = new MarqetaClient();

// Instantiate the CARD class
const card = new Card(marqetaClient);

export const createCard = async (req: IRequest<{}, {}, IMarqetaCreateCard>) => {
  const { userToken } = req.requestor.integrations.marqeta;
  const params = { userToken, ...req.body };
  const userResponse = await card.createCard(params);
  return { user: userResponse };
};

export const listCards = async (userToken: string) => {
  const userResponse = await card.listCards(userToken);
  return { user: userResponse };
};

export const cardTransition = async (req: IRequest<{}, {}, IMarqetaCardTransition>) => {
  const params = { ...req.body };
  const userResponse = await card.cardTransition(params);
  return { user: userResponse };
};

export const getCardDetails = async (req: IRequest<{ cardToken: string }, {}, {}>) => {
  const { cardToken } = req.params;
  const userResponse = await card.getCardDetails(cardToken);
  return { data: userResponse };
};
