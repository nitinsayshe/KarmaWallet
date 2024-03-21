import { IMarqetaDepositAccount, IMarqetaDepositAccountTransition } from '../../integrations/marqeta/types';
import { asCustomError } from '../../lib/customError';
import { camelToSnakeCase } from '../../services/utilities';
import { MarqetaClient } from './marqetaClient';

export class DepositAccountClient {
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
  async listDepositAccountsForUser(userToken: string) {
    try {
      const { data } = await this._marqetaClient._client.get(`/depositaccounts/user/${userToken}`);
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  //  deposit account transition
  async transitionDepositAccount(params: IMarqetaDepositAccountTransition) {
    try {
      const { data } = await this._marqetaClient._client.post('/depositaccounts/transitions', camelToSnakeCase(params));
      console.log('///// transitioning deposit account', data);
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }
}
