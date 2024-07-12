import { sendHttpRequestWithRetry } from '.';
import { asCustomError } from '../../lib/customError';
import { StripeClient } from './stripeClient';

export class Promo {
  private _stripeClient: StripeClient;

  constructor(stripeClient: StripeClient) {
    this._stripeClient = stripeClient;
  }

  async listPromos(numberToList: number) {
    try {
      return sendHttpRequestWithRetry(() => this._stripeClient._client.promotionCodes.list({ limit: numberToList || 100 }));
    } catch (e) {
      throw asCustomError(e);
    }
  }
}
