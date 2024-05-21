import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import Stripe from 'stripe';
import { SdkClient } from './sdkClient';
import CustomError from '../lib/customError';
import { IStripeWebhook } from '../controllers/integrations/stripe/types';

dayjs.extend(utc);

export class StripeClient extends SdkClient {
  _client: Stripe;

  constructor() {
    super('Stripe');
  }

  protected _init() {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new CustomError('Stripe secret key not found');
    this._client = new Stripe(key);
  }

  public async verifyWebhookSignature(webhook: IStripeWebhook) {
    return this._client.webhooks.constructEvent(webhook.body, webhook.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  }

  async getProducts() {
    return this._client.products.list();
  }
}

// export const verifyStripeWebhook = async (req: IRequest<{}, {}, IStripeWebhook>) => {
//   const secret = req.headers
// };
