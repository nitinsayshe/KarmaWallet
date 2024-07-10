import { sendHttpRequestWithRetry } from '.';
import { asCustomError } from '../../lib/customError';
import { StripeClient } from './stripeClient';

export class Invoice {
  private _stripeClient: StripeClient;

  constructor(stripeClient: StripeClient) {
    this._stripeClient = stripeClient;
  }

  async retrieveInvoice(invoiceId: string) {
    try {
      return sendHttpRequestWithRetry(() => this._stripeClient._client.invoices.retrieve(invoiceId));
    } catch (e) {
      throw asCustomError(e);
    }
  }
}
