import { IMarqetaProcessKyc } from '../../integrations/marqeta/types';
import { asCustomError } from '../../lib/customError';
import { camelToSnakeCase } from '../../services/utilities';
import { MarqetaClient } from './marqetaClient';

export class Kyc {
  private _marqetaClient: MarqetaClient;

  constructor(marqetaClient: MarqetaClient) {
    this._marqetaClient = marqetaClient;
  }

  // perform user kyc
  async processKyc(params: IMarqetaProcessKyc) {
    try {
      const { data } = await this._marqetaClient._client.post('/kyc', camelToSnakeCase(params));
      return data;
    } catch (err) {
      console.log(`Error processing kyc for marqeta user with token: ${params.userToken}`);
      throw asCustomError(err);
    }
  }

  // get user kyc list
  async listKyc(userToken: string) {
    try {
      const { data } = await this._marqetaClient._client.get(`/kyc/user/${userToken}`);
      return data;
    } catch (err) {
      console.log(`Error getting kyc data for marqeta user with token: ${userToken}`);
      throw asCustomError(err);
    }
  }

  // get user kyc result
  async getKycResult(kycToken: string) {
    try {
      const { data } = await this._marqetaClient._client.get(`/kyc/${kycToken}`);
      return data;
    } catch (err) {
      console.log(`Error getting kyc result for kyc token: ${kycToken}`);
      throw asCustomError(err);
    }
  }
}
