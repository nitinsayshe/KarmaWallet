import { HttpProxyAgent, HttpsProxyAgent } from 'hpagent';
import { IVGSToken } from '../../integrations/marqeta/types';
import { asCustomError } from '../../lib/customError';
import { VgsClient } from '../vgs';
import { MarqetaClient } from './marqetaClient';

export class CardTokenization {
  private _marqetaClient: MarqetaClient;
  private _vgsClient = new VgsClient();

  constructor(marqetaClient: MarqetaClient) {
    this._marqetaClient = marqetaClient;
  }

  // card tokenization through VGS
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

  // card detokenization through VGS
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
