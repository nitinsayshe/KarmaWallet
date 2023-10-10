import { IMarqetaClientAccessToken, IMarqetaCreateUser, IMarqetaLookUp, IMarqetaUserTransition, IMarqetaUserToken, IMarqetaUpdateUser } from '../../integrations/marqeta/types';
import { asCustomError } from '../../lib/customError';
import { camelToSnakeCase } from '../../services/utilities';
import { MarqetaClient } from './marqetaClient';

export class User {
  private _marqetaClient: MarqetaClient;

  constructor(marqetaClient: MarqetaClient) {
    this._marqetaClient = marqetaClient;
  }

  // create new user
  async createMarqetaUser(params: IMarqetaCreateUser) {
    try {
      const { data } = await this._marqetaClient._client.post('/users', camelToSnakeCase(params));
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // get user list
  async listMarqetaUsers() {
    try {
      const { data } = await this._marqetaClient._client.get('/users');
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // get user
  async getMarqetaUser(userToken: string) {
    try {
      const { data } = await this._marqetaClient._client.get(`/users/${userToken}`);
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // get user by Email
  async getMarqetaUserByEmail(params: IMarqetaLookUp) {
    try {
      const { data } = await this._marqetaClient._client.post('/users/lookup', camelToSnakeCase(params));
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // update user
  async updateMarqetaUser(userToken: string, params: IMarqetaUpdateUser) {
    try {
      const { data } = await this._marqetaClient._client.put(`/users/${userToken}`, camelToSnakeCase(params));
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // user transition
  async userMarqetaTransition(params: IMarqetaUserTransition) {
    try {
      const { data } = await this._marqetaClient._client.post('/usertransitions', camelToSnakeCase(params));
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // list user transition
  async listMarqetaUserTransition(userToken: string) {
    try {
      const { data } = await this._marqetaClient._client.get(`/usertransitions/user/${userToken}`);
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // Create client access toke
  async createMarqetaClientAccessToken(params: IMarqetaClientAccessToken) {
    try {
      const { data } = await this._marqetaClient._client.post('/users/auth/clientaccesstoken', camelToSnakeCase(params));
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // Retrieve client access token
  async getMarqetaClientAccessToken(accessToken: string) {
    try {
      const { data } = await this._marqetaClient._client.get(`/users/auth/clientaccesstoken/${accessToken}`);
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // Generate a one-time user authentication token
  async createMarqetaUserAuthToken(params: IMarqetaUserToken) {
    try {
      const { data } = await this._marqetaClient._client.post('/users/auth/onetime', camelToSnakeCase(params));
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }
}
