import { IMarqetaUserToken } from '../../integrations/marqeta/types';
import { asCustomError } from '../../lib/customError';
import { MarqetaClient } from './marqetaClient';

export class DepositAccount {
  private _marqetaClient: MarqetaClient;

  constructor(marqetaClient: MarqetaClient) {
    this._marqetaClient = marqetaClient;
  }

  // Create deposit account
  async createDepositAccount(params: IMarqetaUserToken) {
    try {
      const { data } = await this._marqetaClient._client.post('/depositaccounts', params);
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
