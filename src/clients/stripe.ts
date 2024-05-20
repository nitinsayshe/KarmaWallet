import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import Stripe from 'stripe';
import { SdkClient } from './sdkClient';
import CustomError from '../lib/customError';

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

  async getProducts() {
    return this._client.products.list();
  }
}

// export const verifyStripeWebhook = async (req: IRequest<{}, {}, IStripeWebhook>) => {
//   const secret = req.headers
// };
