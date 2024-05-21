export interface IStripeWebhook {
  body: string | Buffer;
  // update this typing
  headers: any;
  secret: string;
  tolerance?: number;
  cryptoProvider?: any;
  receivedAt?: number;
}
