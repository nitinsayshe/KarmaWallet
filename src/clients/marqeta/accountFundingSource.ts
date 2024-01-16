import { IMarqetaACHBankTransfer, IMarqetaACHBankTransferTransition, IMarqetaACHPlaidFundingSource } from '../../integrations/marqeta/types';
import { asCustomError } from '../../lib/customError';
import { camelToSnakeCase } from '../../services/utilities';
import { MarqetaClient } from './marqetaClient';

export const { MARQETA_PROGRAM_FUNDING_SOURCE_TOKEN } = process.env;

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

  // update ACH funding Source
  async updateACHFundingSource(fundingSourceToken: String, params: any) {
    try {
      const { data } = await this._marqetaClient._client.put(`/fundingsources/ach/${fundingSourceToken}`, camelToSnakeCase(params));
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // List funding source for user
  async listACHFundingSourceForUser(userToken: string, params?: any) {
    try {
      const { data } = await this._marqetaClient._client.get(`/fundingsources/user/${userToken}`, camelToSnakeCase(params));
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // Create ACH Bank transfer
  async createACHBankTransfer(params: IMarqetaACHBankTransfer) {
    try {
      const { data } = await this._marqetaClient._client.post('/banktransfers/ach', camelToSnakeCase(params));
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  async updateACHBankTransfer(params: IMarqetaACHBankTransferTransition) {
    try {
      const { data } = await this._marqetaClient._client.post('/banktransfers/ach/transitions', camelToSnakeCase(params));
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // list ACH Bank transfers
  async listACHBankTransfer(queryParams: Record<string, string>) {
    try {
      const queryString = new URLSearchParams(camelToSnakeCase(queryParams)).toString();
      const { data } = await this._marqetaClient._client.get(`/banktransfers/ach?${queryString}`);
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // get ACH Bank Transfer
  async getACHBankTransfer(achToken: string) {
    try {
      const { data } = await this._marqetaClient._client.get(`/banktransfers/ach/${achToken}`);
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // Create ACH Bank transfer transition
  async createACHBankTransferTransition(params: IMarqetaACHBankTransferTransition) {
    try {
      const { data } = await this._marqetaClient._client.post('/banktransfers/ach/transitions', camelToSnakeCase(params));
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }
}
