import Stripe from 'stripe';
import { sendHttpRequestWithRetry } from '.';
import { asCustomError } from '../../lib/customError';
import { StripeClient } from './stripeClient';

export class Checkout {
  private _stripeClient: StripeClient;

  constructor(stripeClient: StripeClient) {
    this._stripeClient = stripeClient;
  }

  async createCheckoutSession(checkoutData: Stripe.Checkout.SessionCreateParams) {
    try {
      return sendHttpRequestWithRetry(() => this._stripeClient._client.checkout.sessions.create(checkoutData));
    } catch (e) {
      throw asCustomError(e);
    }
  }

  async retrieveCheckoutSession(checkoutSessionId: string) {
    try {
      return sendHttpRequestWithRetry(() => this._stripeClient._client.checkout.sessions.retrieve(checkoutSessionId));
    } catch (e) {
      throw asCustomError(e);
    }
  }
}
