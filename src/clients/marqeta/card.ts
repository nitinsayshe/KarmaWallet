import { HttpProxyAgent, HttpsProxyAgent } from 'hpagent';
import { IMarqetaCardTransition, IMarqetaCreateCard, IVGSToken } from '../../integrations/marqeta/types';
import { asCustomError } from '../../lib/customError';
import { camelToSnakeCase } from '../../services/utilities';
import { VgsClient } from '../vgs';
import { MarqetaClient } from './marqetaClient';

export class Card {
  private _marqetaClient: MarqetaClient;
  private _vgsClient = new VgsClient();

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
      const { data } = await this._marqetaClient._client.get(`/cards/${cardToken}/showpan?show_cvv_number=true`, {
        httpAgent: new HttpProxyAgent(this._vgsClient.agentOptions),
        httpsAgent: new HttpsProxyAgent({
          ...this._vgsClient.agentOptions,
          rejectUnauthorized: false,
        }),
      });

      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  async deTokenizeCard(params: IVGSToken) {
    try {
      const { data } = await this._vgsClient._reverseProxyClient.post('/post', params);
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }
}
