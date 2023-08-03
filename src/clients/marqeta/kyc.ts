import { IMarqetaProcessKyc } from '../../integrations/marqeta/types';
import { asCustomError } from '../../lib/customError';
import { MarqetaClient } from './marqetaClient';

export class Kyc {
  private _marqetaClient: MarqetaClient;

  constructor(marqetaClient: MarqetaClient) {
    this._marqetaClient = marqetaClient;
  }

  // perform user kyc
  async processKyc(params: IMarqetaProcessKyc) {
    try {
      const { data } = await this._marqetaClient._client.post('/kyc', params);
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // get user kyc list
  async listKyc(userToken: string) {
    try {
      const { data } = await this._marqetaClient._client.get(`/kyc/user/${userToken}`);
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }
}
