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
  const { user_token, card_product_token } = req.body;
  const responseMessage = '';
  const userResponse = await card.createCard({ user_token, card_product_token });
  return { message: responseMessage, user: userResponse };
};

export const listCards = async (userToken:string) => {
  const responseMessage = '';
  const userResponse = await card.listCards(userToken);
  return { message: responseMessage, user: userResponse };
};

export const cardTransition = async (req: IRequest<{}, {}, IMarqetaCardTransition>) => {
  const { user_token, channel, state } = req.body;
  const responseMessage = '';
  const userResponse = await card.cardTransition({ user_token, channel, state });
  return { message: responseMessage, user: userResponse };
};
