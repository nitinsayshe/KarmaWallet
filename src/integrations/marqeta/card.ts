/* eslint-disable camelcase */
import { GetPaginiatedResourceParams } from '.';
import { Card } from '../../clients/marqeta/card';
import { MarqetaClient } from '../../clients/marqeta/marqetaClient';
import { ICardDocument } from '../../models/card';
import { IRequest } from '../../types/request';
import { IMarqetaCardTransition, IMarqetaCreateCard, ListCardsResponse, MarqetaCardModel, MarqetaCardState, PaginatedMarqetaResponse } from './types';
// Instantiate the MarqetaClient
const marqetaClient = new MarqetaClient();

// Instantiate the CARD class
const cardClient = new Card(marqetaClient);

export const createCard = async (params:IMarqetaCreateCard) => {
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

export const terminateMarqetaCards = async (cards: ICardDocument[]) => {
  const transitionedCards = [];
  // terminate the cards in marqeta
  for (const card of cards) {
    try {
      const transitionCard = await cardClient.cardTransition({
        cardToken: card.integrations.marqeta.card_token,
        channel: 'API',
        state: MarqetaCardState.TERMINATED,
        reasonCode: '01',
      });
      transitionedCards.push(transitionCard);
    } catch (err) {
      throw new Error('Error terminating Marqeta card');
    }
  }

  return transitionedCards;
};
