/* eslint-disable camelcase */
import { GetPaginiatedResourceParams } from '.';
import { Card } from '../../clients/marqeta/card';
import { MarqetaClient } from '../../clients/marqeta/marqetaClient';
import { IRequest } from '../../types/request';
import { IMarqetaCardTransition, IMarqetaCreateCard, ListCardsResponse, MarqetaCardModel, PaginatedMarqetaResponse } from './types';
// Instantiate the MarqetaClient
const marqetaClient = new MarqetaClient();

// Instantiate the CARD class
const cardClient = new Card(marqetaClient);

export const createCard = async (params: IMarqetaCreateCard) => {
  console.log('///// Ordering a card with product token:', params.cardProductToken);
  const cardResponse = await cardClient.createCard(params);
  return cardResponse;
};

export const listCards = async (userToken: string): Promise<ListCardsResponse> => {
  const cardResponse = await cardClient.listCards(userToken);
  return { cards: cardResponse };
};

export const cardTransition = async (req: IRequest<{}, {}, IMarqetaCardTransition>) => {
  const params = { ...req.body };
  const userResponse = await cardClient.cardTransition(params);
  return { user: userResponse };
};

export const getCardDetails = async (req: IRequest<{ cardToken: string }, {}, {}>) => {
  const { cardToken } = req.params;
  const userResponse = await cardClient.getCardDetails(cardToken);
  return { data: userResponse };
};

export const getCardsForUser = async (queryParams: GetPaginiatedResourceParams): Promise<PaginatedMarqetaResponse<MarqetaCardModel[]>> => {
  const cards = await cardClient.listCards(queryParams?.userToken, queryParams);
  return cards;
};
