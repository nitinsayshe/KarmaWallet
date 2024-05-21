import { IRequest } from '../../../types/request';

export interface IStripeWebhook extends IRequest {
  body: string | Buffer;
  // update this typing
  headers: any;
  secret: string;
  tolerance?: number;
  cryptoProvider?: any;
  receivedAt?: number;
}
