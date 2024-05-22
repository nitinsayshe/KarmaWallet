import { asCustomError } from '../../lib/customError';
import { StripeClient } from './stripeClient';

export class Customer {
  private _stripeClient: StripeClient;

  constructor(stripeClient: StripeClient) {
    this._stripeClient = stripeClient;
  }

  async createCustomer(email: string, name: string) {
    try {
      return this._stripeClient._client.customers.create({ email, name });
    } catch (e) {
      throw asCustomError(e);
    }
  }

  async updateCustomer(customerId: string, email: string, name: string) {
    try {
      return this._stripeClient._client.customers.update(customerId, { email, name });
    } catch (e) {
      throw asCustomError(e);
    }
  }

  async retrieveCustomer(customerId: string) {
    try {
      return this._stripeClient._client.customers.retrieve(customerId);
    } catch (e) {
      throw asCustomError(e);
    }
  }

  async listCustomers(numberToList: number) {
    try {
      return this._stripeClient._client.customers.list({
        limit: numberToList || 100,
      });
    } catch (e) {
      throw asCustomError(e);
    }
  }

  async deleteCustomer(customerId: string) {
    try {
      return this._stripeClient._client.customers.del(customerId);
    } catch (e) {
      throw asCustomError(e);
    }
  }
}
