import { IMarqetaCreateGPAorder, IMarqetaUnloadGPAOrder } from '../../integrations/marqeta/types';
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

  // get reserve account balances (Program Funding Source Balance)
  async getProgramFundingBalance() {
    try {
      const { data } = await this._marqetaClient._client.get('/programreserve/balances');
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  async unloadGPA(params: IMarqetaUnloadGPAOrder) {
    try {
      const { data } = await this._marqetaClient._client.post('gpaorders/unloads', {
        amount: params.amount,
        original_order_token: params.orderToken,
      });
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }
}
