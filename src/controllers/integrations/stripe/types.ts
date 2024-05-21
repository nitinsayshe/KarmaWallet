import { IRequest } from '../../../types/request';

export interface IStripeWebhookBody {
  body: string | Buffer;
}

export interface IStripeWebhookRequest extends IRequest {
  body: string | Buffer;
  secret: string;
  tolerance?: number;
  cryptoProvider?: any;
  receivedAt?: number;
}
