import { asCustomError } from '../../lib/customError';
import { camelToSnakeCase } from '../../services/utilities';
import { MarqetaClient } from './marqetaClient';

export class Transactions {
  private _marqetaClient: MarqetaClient;

  constructor(marqetaClient: MarqetaClient) {
    this._marqetaClient = marqetaClient;
  }

  // list transactions
  async listTransaction(queryParams: Record<string, string>) {
    try {
      const queryString = new URLSearchParams(camelToSnakeCase(queryParams)).toString();
      const { data } = await this._marqetaClient._client.get(`transactions?${queryString}`);
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }
}
