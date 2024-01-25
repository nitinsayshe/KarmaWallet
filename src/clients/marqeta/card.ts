import { HttpsProxyAgent } from 'https-proxy-agent';
import { IMarqetaCardTransition, IMarqetaCreateCard } from '../../integrations/marqeta/types';
import { asCustomError } from '../../lib/customError';
import { camelToSnakeCase } from '../../services/utilities';
import { VgsClient } from '../vgs';
import { MarqetaClient } from './marqetaClient';

export class Card {
  private _marqetaClient: MarqetaClient;

  constructor(marqetaClient: MarqetaClient) {
    this._marqetaClient = marqetaClient;
  }

  // create new card
  async createCard(params: IMarqetaCreateCard) {
    try {
      const { data } = await this._marqetaClient._client.post('/cards', camelToSnakeCase(params));
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // get user cards list
  async listCards(userToken: string, queryParams?: Record<string, string>) {
    try {
      const queryString = new URLSearchParams(camelToSnakeCase(queryParams)).toString();
      const { data } = await this._marqetaClient._client.get(`/cards/user/${userToken}?${queryString}`);
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // card trnas
  async cardTransition(params: IMarqetaCardTransition) {
    try {
      const { data } = await this._marqetaClient._client.post('/cardtransitions', camelToSnakeCase(params));
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // get card details
  async getCardDetails(cardToken: string) {
    try {
      const { data } = await this._marqetaClient._client.get(`/cards/${cardToken}`);
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // tokenize card through VGS
  async tokenizeCard(cardToken: string) {
    try {
      const vgsClient = new VgsClient();
      const data = await this._marqetaClient._client.get(`/cards/${cardToken}`, { proxy: false, httpsAgent: new HttpsProxyAgent(vgsClient.outboundProxy, { rejectUnauthorized: false }) });
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }
}
