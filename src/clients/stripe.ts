import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import Stripe from 'stripe';
import { SdkClient } from './sdkClient';
import CustomError, { asCustomError } from '../lib/customError';

dayjs.extend(utc);

export class StripeClient extends SdkClient {
  _client: Stripe;

  constructor() {
    super('Stripe');
  }

  protected _init() {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new CustomError('Stripe secret key not found');
    console.log('Stripe secret key:', key);
    const stripeClient = new Stripe(key);
    console.log('Stripe client in init:', stripeClient);
    if (!stripeClient) throw new CustomError('Failed to initialize Stripe client');
    this._client = stripeClient;
  }

  public async createEventAndVerifyWebhook(body: string | Buffer, stripeSignature: string) {
    try {
      const event = this._client.webhooks.constructEvent(body, stripeSignature, process.env.STRIPE_WEBHOOK_SECRET);
      return event;
    } catch (e) {
      throw asCustomError(e);
    }
  }

  public async getProducts() {
    return this._client.products.list();
  }
}
