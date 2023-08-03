import { IMarqetaCreateGPAorder } from '../../integrations/marqeta/types';
import { asCustomError } from '../../lib/customError';
import { camelToSnakeCase } from '../../services/utilities';
import { MarqetaClient } from './marqetaClient';

export class GPA {
  private _marqetaClient: MarqetaClient;

  constructor(marqetaClient: MarqetaClient) {
    this._marqetaClient = marqetaClient;
  }

  // fund the user GPA
  async gpaOrder(params: IMarqetaCreateGPAorder) {
    try {
      const { data } = await this._marqetaClient._client.post('/gpaorders', camelToSnakeCase(params));
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // get GPA Balance
  async getBalance(userToken: string) {
    try {
      const { data } = await this._marqetaClient._client.get(`/balances/${userToken}`);
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }
}
