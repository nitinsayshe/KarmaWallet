import { IListPricesParams } from '../../integrations/stripe/types';
import { asCustomError } from '../../lib/customError';
import { StripeClient } from './stripeClient';

export class Price {
  private _stripeClient: StripeClient;

  constructor(stripeClient: StripeClient) {
    this._stripeClient = stripeClient;
  }

  async listPrices(params: IListPricesParams) {
    try {
      return this._stripeClient._client.prices.list(params);
    } catch (e) {
      throw asCustomError(e);
    }
  }
}
