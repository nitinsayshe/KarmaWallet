import { IMarqetaDepositAccount } from '../../integrations/marqeta/types';
import { asCustomError } from '../../lib/customError';
import { camelToSnakeCase } from '../../services/utilities';
import { MarqetaClient } from './marqetaClient';

export class DepositAccount {
  private _marqetaClient: MarqetaClient;

  constructor(marqetaClient: MarqetaClient) {
    this._marqetaClient = marqetaClient;
  }

  // Create deposit account
  async createDepositAccount(params: IMarqetaDepositAccount) {
    try {
      const { data } = await this._marqetaClient._client.post('/depositaccounts', camelToSnakeCase(params));
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // get deposit account details
  async getDepositAccount(depositAccountToken: string) {
    try {
      const { data } = await this._marqetaClient._client.get(`/depositaccounts/${depositAccountToken}`);
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // List user deposit account
  async listDepositAccount(userToken: string) {
    try {
      const { data } = await this._marqetaClient._client.get(`/depositaccounts/user/${userToken}`);
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }
}
