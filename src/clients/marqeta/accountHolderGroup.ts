import { IMarqetaACHGroup } from '../../integrations/marqeta/types';
import { asCustomError } from '../../lib/customError';
import { camelToSnakeCase } from '../../services/utilities';
import { MarqetaClient } from './marqetaClient';

export class ACHGroup {
  private _marqetaClient: MarqetaClient;

  constructor(marqetaClient: MarqetaClient) {
    this._marqetaClient = marqetaClient;
  }

  // create Account holder group
  async createACHGroup(params: IMarqetaACHGroup) {
    try {
      const { data } = await this._marqetaClient._client.post('/accountholdergroups', camelToSnakeCase(params));
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // get Account holder group list
  async listACHGroup() {
    try {
      const { data } = await this._marqetaClient._client.get('/accountholdergroups');
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // get Account holder group
  async getACHGroup(accountGroupToken:string) {
    try {
      const { data } = await this._marqetaClient._client.get(`/accountholdergroups/${accountGroupToken}`);
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // update Account holder group
  async updateACHGroup(accountGroupToken:string, params:IMarqetaACHGroup) {
    try {
      const { data } = await this._marqetaClient._client.put(
        `/accountholdergroups/${accountGroupToken}`,
        camelToSnakeCase(params),
      );
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }
}
