/* eslint-disable camelcase */
import { CardTokenization } from '../../clients/marqeta/cardTokenization';
import { MarqetaClient } from '../../clients/marqeta/marqetaClient';
import { IShareableTokenizedCard, IVGSToken } from './types';
// Instantiate the MarqetaClient
const marqetaClient = new MarqetaClient(true); // set the parameter as true for marqeta private apis

// Instantiate the CardTokenization class
const cardTokenizationClient = new CardTokenization(marqetaClient);

export const getShareableCardTokenization = ({
  pan,
  cvv_number,
  expiration,
}: IVGSToken): IShareableTokenizedCard => ({
  pan,
  cvvNumber: cvv_number,
  expiration,
});

export const tokenizeCard = async (cardToken: string) => {
  const vgsResponse = await cardTokenizationClient.tokenizeCard(cardToken);
  return { data: vgsResponse };
};

export const deTokenizeCard = async (params: IVGSToken) => {
  const vgsResponse = await cardTokenizationClient.deTokenizeCard(params);
  return { data: vgsResponse };
};
