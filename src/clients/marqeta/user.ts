import { IMarqetaClientAccessToken, IMarqetaCreateUser, IMarqetaLookUp, IMarqetaUserTransition } from '../../integrations/marqeta/types';
import { asCustomError } from '../../lib/customError';
import { camelToSnakeCase } from '../../services/utilities';
import { MarqetaClient } from './marqetaClient';

export class User {
  private _marqetaClient: MarqetaClient;

  constructor(marqetaClient: MarqetaClient) {
    this._marqetaClient = marqetaClient;
  }

  // create new user
  async createUser(params: IMarqetaCreateUser) {
    try {
      const { data } = await this._marqetaClient._client.post('/users', camelToSnakeCase(params));
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

  // get user
  async getUser(userToken: string) {
    try {
      const { data } = await this._marqetaClient._client.get(`/users/${userToken}`);
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // get user by Email
  async getUserByEmail(params: IMarqetaLookUp) {
    try {
      const { data } = await this._marqetaClient._client.post('/users/lookup', camelToSnakeCase(params));
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // update user
  async updateUser(userToken: string, params: IMarqetaCreateUser) {
    try {
      const { data } = await this._marqetaClient._client.put(`/users/${userToken}`, camelToSnakeCase(params));
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // user transition
  async userTransition(params: IMarqetaUserTransition) {
    try {
      const { data } = await this._marqetaClient._client.post('/usertransitions', camelToSnakeCase(params));
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // list user transition
  async listUserTransition(userToken: string) {
    try {
      const { data } = await this._marqetaClient._client.get(`/usertransitions/user/${userToken}`);
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // Create client access toke
  async createClientAccessToken(params: IMarqetaClientAccessToken) {
    try {
      const { data } = await this._marqetaClient._client.post('/users/auth/clientaccesstoken', camelToSnakeCase(params));
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // Retrieve client access token
  async getClientAccessToken(accessToken: string) {
    try {
      const { data } = await this._marqetaClient._client.get(`/users/auth/clientaccesstoken/${accessToken}`);
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }
}
