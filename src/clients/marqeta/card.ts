import { IMarqetaCardTransition, IMarqetaCreateCard } from '../../integrations/marqeta/types';
import { asCustomError } from '../../lib/customError';
import { MarqetaClient } from './marqetaClient';

export class Card {
  private _marqetaClient: MarqetaClient;

  constructor(marqetaClient: MarqetaClient) {
    this._marqetaClient = marqetaClient;
  }

  // create new card
  async createCard(params: IMarqetaCreateCard) {
    try {
      const { data } = await this._marqetaClient._client.post('/cards', params);
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // get user cards list
  async listCards(userToken: string) {
    try {
      const { data } = await this._marqetaClient._client.get(`/cards/user/${userToken}`);
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // card trnas
  async cardTransition(params: IMarqetaCardTransition) {
    try {
      const { data } = await this._marqetaClient._client.post('/cardtransitions', params);
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // get card details (PAN, CVV)
  async getCardDetails(cardToken: string, queryParams: Record<string, string>) {
    try {
      const queryString = new URLSearchParams(queryParams).toString();
      const { data } = await this._marqetaClient._client.get(`/cards/${cardToken}/showpan?${queryString}`);
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }
}
