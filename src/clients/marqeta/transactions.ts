import { IMarqetaMakeTransaction, IMarqetaMakeTransactionAdvice, IMarqetaMakeTransactionClearing } from '../../integrations/marqeta/types';
import { asCustomError } from '../../lib/customError';
import { camelToSnakeCase } from '../../services/utilities';
import { MarqetaClient } from './marqetaClient';

export class Transactions {
  private _marqetaClient: MarqetaClient;

  constructor(marqetaClient: MarqetaClient) {
    this._marqetaClient = marqetaClient;
  }

  // make transaction
  async makeTransaction(params: IMarqetaMakeTransaction) {
    try {
      const { data } = await this._marqetaClient._client.post('/simulate/authorization', camelToSnakeCase(params));
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // make transaction advice
  async makeTransactionAdvice(params: IMarqetaMakeTransactionAdvice) {
    try {
      const { data } = await this._marqetaClient._client.post('/simulate/authorization/advice', camelToSnakeCase(params));
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // make transaction clearing
  async makeTransactionClearing(params: IMarqetaMakeTransactionClearing) {
    try {
      const { data } = await this._marqetaClient._client.post('/simulate/clearing', camelToSnakeCase(params));
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
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
