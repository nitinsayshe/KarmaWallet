import Stripe from 'stripe';
import { asCustomError } from '../../lib/customError';
import { StripeClient } from './stripeClient';

export class Checkout {
  private _stripeClient: StripeClient;

  constructor(stripeClient: StripeClient) {
    this._stripeClient = stripeClient;
  }

  async createCheckoutSession(checkoutData: Stripe.Checkout.SessionCreateParams) {
    try {
      return this._stripeClient._client.checkout.sessions.create(checkoutData);
    } catch (e) {
      throw asCustomError(e);
    }
  }
}
