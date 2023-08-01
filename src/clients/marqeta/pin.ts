import { IMarqetaRevealPin, IMarqetaCreatePin } from '../../integrations/marqeta/types';
import { asCustomError } from '../../lib/customError';
import { camelToSnakeCase } from '../../services/utilities';
import { MarqetaClient } from './marqetaClient';

export class Pin {
  private _marqetaClient: MarqetaClient;

  constructor(marqetaClient: MarqetaClient) {
    this._marqetaClient = marqetaClient;
  }

  // create pin control token
  async createPinControlToken(params: IMarqetaCreatePin) {
    try {
      const { data } = await this._marqetaClient._client.post('/pins/controltoken', camelToSnakeCase(params));
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // set and update the pin
  async setPin(params: IMarqetaCreatePin) {
    try {
      const { data } = await this._marqetaClient._client.put('/pins', camelToSnakeCase(params));
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // get pin
  async getPin(params: IMarqetaRevealPin) {
    try {
      const { data } = await this._marqetaClient._client.post('/pins/reveal', camelToSnakeCase(params));
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }
}
