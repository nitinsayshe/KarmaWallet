import { IAppleWalletProvision, IGoogleWalletProvision, ISamsungWalletProvision, IDigitalWalletTokenTransition } from '../../integrations/marqeta/types';
import { asCustomError } from '../../lib/customError';
import { camelToSnakeCase } from '../../services/utilities';
import { MarqetaClient } from './marqetaClient';

export class DigitalWalletManagement {
  private _marqetaClient: MarqetaClient;

  constructor(marqetaClient: MarqetaClient) {
    this._marqetaClient = marqetaClient;
  }

  // Create digital wallet token provisioning request for Apple Wallet
  async appleWalletProvision(params: IAppleWalletProvision) {
    try {
      const { data } = await this._marqetaClient._client.post('/digitalwalletprovisionrequests/applepay', camelToSnakeCase(params));
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // Create digital wallet token provisioning request for Google Wallet
  async googleWalletProvision(params: IGoogleWalletProvision) {
    try {
      const { data } = await this._marqetaClient._client.post('/digitalwalletprovisionrequests/androidpay', camelToSnakeCase(params));
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // Create digital wallet token provisioning request for Samsung Wallet
  async samsungWalletProvision(params: ISamsungWalletProvision) {
    try {
      const { data } = await this._marqetaClient._client.post('/digitalwalletprovisionrequests/samsungpay', camelToSnakeCase(params));
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // Create digital wallet token transition
  async digitalWalletTransition(params: IDigitalWalletTokenTransition) {
    try {
      const { data } = await this._marqetaClient._client.post('/digitalwallettokentransitions', camelToSnakeCase(params));
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // List digital wallet tokens for card
  async listDigitalWalletForUserCard(cardToken: string) {
    try {
      const { data } = await this._marqetaClient._client.get(`/digitalwallettokens/card/${cardToken}`);
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }
}
