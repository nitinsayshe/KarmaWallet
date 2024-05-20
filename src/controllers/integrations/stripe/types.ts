export interface IStripeWebhook {
  payload: string | Buffer;
  header: string | Buffer | Array<string>;
  secret: string;
  tolerance?: number;
  cryptoProvider?: any;
  receivedAt?: number;
}
