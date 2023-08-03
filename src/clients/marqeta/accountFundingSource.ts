import { IMarqetaACHPlaidFundingSource } from '../../integrations/marqeta/types';
import { asCustomError } from '../../lib/customError';
import { camelToSnakeCase } from '../../services/utilities';
import { MarqetaClient } from './marqetaClient';

export class ACHSource {
  private _marqetaClient: MarqetaClient;

  constructor(marqetaClient: MarqetaClient) {
    this._marqetaClient = marqetaClient;
  }

  // create Account funding source vie plaid integration
  async createAchFundingSource(params: IMarqetaACHPlaidFundingSource) {
    try {
      const { data } = await this._marqetaClient._client.post('/fundingsources/ach/partner', camelToSnakeCase(params));
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }
}
