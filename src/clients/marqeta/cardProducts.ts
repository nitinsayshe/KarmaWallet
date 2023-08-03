import { asCustomError } from '../../lib/customError';
import { camelToSnakeCase } from '../../services/utilities';
import { MarqetaClient } from './marqetaClient';

export class CardProduct {
  private _marqetaClient: MarqetaClient;

  constructor(marqetaClient: MarqetaClient) {
    this._marqetaClient = marqetaClient;
  }

  // create card product
  async createCardProduct(params: any) {
    try {
      const { data } = await this._marqetaClient._client.post('/cardproducts', camelToSnakeCase(params));
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // get card products list
  async listCardProduct() {
    try {
      const { data } = await this._marqetaClient._client.get('/cardproducts');
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // update card product
  async updateCardproduct(cardproductToken: string) {
    try {
      const { data } = await this._marqetaClient._client.put(`/cardproducts/${cardproductToken}`);
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // get card product
  async getCardproduct(cardproductToken: string) {
    try {
      const { data } = await this._marqetaClient._client.get(`/cardproducts/${cardproductToken}`);
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }
}
