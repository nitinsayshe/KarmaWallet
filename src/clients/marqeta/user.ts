import { IMarqetaCreateUser } from '../../integrations/marqeta/types';
import { asCustomError } from '../../lib/customError';
import { MarqetaClient } from './marqetaClient';

export class User {
  private _marqetaClient: MarqetaClient;

  constructor(marqetaClient: MarqetaClient) {
    this._marqetaClient = marqetaClient;
  }

  // create new user
  async createUser(params: IMarqetaCreateUser) {
    try {
      const { data } = await this._marqetaClient._client.post('/users', params);
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // get user list
  async listUsers() {
    try {
      const { data } = await this._marqetaClient._client.get('/users');
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }
}
