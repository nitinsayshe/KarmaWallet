import Stripe from 'stripe';
import { sendHttpRequestWithRetry } from '.';
import { asCustomError } from '../../lib/customError';
import { StripeClient } from './stripeClient';

export class Subscription {
  private _stripeClient: StripeClient;

  constructor(stripeClient: StripeClient) {
    this._stripeClient = stripeClient;
  }

  async createSubscription(subscriptionData: Stripe.SubscriptionCreateParams) {
    try {
      return sendHttpRequestWithRetry(() => this._stripeClient._client.subscriptions.create(subscriptionData));
    } catch (e) {
      throw asCustomError(e);
    }
  }

  async getSubscriptionById(subscriptionId: string) {
    try {
      return sendHttpRequestWithRetry(() => this._stripeClient._client.subscriptions.retrieve(subscriptionId));
    } catch (e) {
      throw asCustomError(e);
    }
  }
}
