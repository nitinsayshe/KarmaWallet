/* eslint-disable camelcase */
import { Card } from '../../clients/marqeta/card';
import { MarqetaClient } from '../../clients/marqeta/marqetaClient';
import { IRequest } from '../../types/request';
import { IMarqetaCardTransition, IMarqetaCreateCard } from './types';
// Instantiate the MarqetaClient
const marqetaClient = new MarqetaClient();

// Instantiate the CARD class
const card = new Card(marqetaClient);

export const createCard = async (req: IRequest<{ userToken: string }, {}, IMarqetaCreateCard>) => {
  const { userToken } = req.params;
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

export const getCardDetails = async (req: IRequest<{ cardToken: string }, { showCvv: string }, {}>) => {
  const { cardToken } = req.params;
  const { showCvv } = req.query;
  const userResponse = await card.getCardDetails(cardToken, { show_cvv_number: showCvv });
  return { data: userResponse };
};
