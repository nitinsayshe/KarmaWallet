/* eslint-disable camelcase */
import { CardTokenization } from '../../clients/marqeta/cardTokenization';
import { MarqetaClient } from '../../clients/marqeta/marqetaClient';
import { IVGSToken } from './types';
// Instantiate the MarqetaClient
const marqetaClient = new MarqetaClient(true);

// Instantiate the CardTokenization class
const cardTokenizationClient = new CardTokenization(marqetaClient);

export const tokenizeCard = async (cardToken : string) => {
  const vgsResponse = await cardTokenizationClient.tokenizeCard(cardToken);
  return { data: vgsResponse };
};

export const deTokenizeCard = async (params: IVGSToken) => {
  const userResponse = await cardTokenizationClient.deTokenizeCard(params);
  return { data: userResponse };
};
