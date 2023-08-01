import { IMarqetaCreatePin } from '../../integrations/marqeta/types';
import { asCustomError } from '../../lib/customError';
import { camelToSnakeCase } from '../../services/utilities';
import { MarqetaClient } from './marqetaClient';

export class Transactions {
  private _marqetaClient: MarqetaClient;

  constructor(marqetaClient: MarqetaClient) {
    this._marqetaClient = marqetaClient;
  }

  // list transactions
  async listTransactions(params: IMarqetaCreatePin) {
    try {
      const { data } = await this._marqetaClient._client.post('/pins/controltoken', camelToSnakeCase(params));
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }
}
