import Stripe from 'stripe';
import { sendHttpRequestWithRetry } from '.';
import { asCustomError } from '../../lib/customError';
import { StripeClient } from './stripeClient';

export class Product {
  private _stripeClient: StripeClient;

  constructor(stripeClient: StripeClient) {
    this._stripeClient = stripeClient;
  }

  async createProduct(productData: Stripe.ProductCreateParams) {
    try {
      return sendHttpRequestWithRetry(() => this._stripeClient._client.products.create(productData));
    } catch (e) {
      throw asCustomError(e);
    }
  }

  async updateProduct(productId: string, productData: Stripe.ProductUpdateParams) {
    try {
      return sendHttpRequestWithRetry(() => this._stripeClient._client.products.update(productId, productData));
    } catch (e) {
      throw asCustomError(e);
    }
  }

  async listProducts(numberToList: number) {
    try {
      return sendHttpRequestWithRetry(() => this._stripeClient._client.products.list({ limit: numberToList || 100 }));
    } catch (e) {
      throw asCustomError(e);
    }
  }

  async getPrice(priceId: string) {
    try {
      return sendHttpRequestWithRetry(() => this._stripeClient._client.prices.retrieve(priceId));
    } catch (e) {
      throw asCustomError(e);
    }
  }
}
