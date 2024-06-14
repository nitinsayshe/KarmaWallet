import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import crypto, { createHmac } from 'crypto';
import { asCustomError } from '../../lib/customError';
import { SdkClient } from '../sdkClient';
import {
  GetSessionTokenResponse,
  CreateUserRequest,
  KardAccessToken,
  AddCardToUserRequest,
  AddCardToUserResponse,
  UpdateUserRequest,
  QueueTransactionsRequest,
  GetRewardsMerchantsResponse,
  KardInvalidSignatureError,
  KardServerError,
  GetEligibleLocationsRequest,
  GetLocationsRequest,
  GetLocationsByMerchantIdRequest,
  KardMerchantLocations,
  KardMerchantLocation,
  Merchant,
  PaginationFields,
} from './types';

const {
  KARD_API_URL,
  KARD_COGNITO_URL,
  KARD_ISSUER_NAME,
  KARD_ISSUER_WEBHOOK_KEY,
  KARD_ISSUER_CLIENT_HASH,
  KARD_ISSUER_ISSUER_NAME,
  KARD_KARMAWALLET_AWS_ROLE,
  KARD_ISSUER_AWS_ROLE,
  KARD_AWS_ENV,
} = process.env;

const validateEnvironmentVariables = (): Error | null => {
  const loadingErrorPrefix = 'Error Loading Kard Environment Variables: ';
  if (!KARD_API_URL) {
    return new Error(`${loadingErrorPrefix}KARD_API_URL not found`);
  }
  if (!KARD_COGNITO_URL) {
    return new Error(`${loadingErrorPrefix}KARD_COGNITO_URL not found`);
  }
  if (!KARD_ISSUER_NAME) {
    return new Error(`${loadingErrorPrefix}KARD_ISSUER_NAME not found`);
  }
  if (!KARD_ISSUER_WEBHOOK_KEY) {
    return new Error(`${loadingErrorPrefix}KARD_ISSUER_WEBHOOK_KEY not found`);
  }
  if (!KARD_ISSUER_CLIENT_HASH) {
    return new Error(`${loadingErrorPrefix}KARD_ISSUER_CLIENT_HASH not found`);
  }
  if (!KARD_ISSUER_ISSUER_NAME) {
    return new Error(`${loadingErrorPrefix}KARD_ISSUER_ISSUER_NAME not found`);
  }
  if (!KARD_KARMAWALLET_AWS_ROLE) {
    return new Error(`${loadingErrorPrefix}KARD_KARMAWALLET_AWS_ROLE not found`);
  }
  if (!KARD_ISSUER_AWS_ROLE) {
    return new Error(`${loadingErrorPrefix}KARD_ISSUER_AWS_ROLE not found`);
  }
  if (!KARD_AWS_ENV) {
    return new Error(`${loadingErrorPrefix}KARD_AWS_ENV not found`);
  }

  return null;
};

export const KardIssuerIssuerName = KARD_ISSUER_ISSUER_NAME;
export const KardIssuerClientHash = KARD_ISSUER_CLIENT_HASH;
export const KardIssuerWebhookKey = KARD_ISSUER_WEBHOOK_KEY;
export const KardKarmaWalletAwsRole = KARD_KARMAWALLET_AWS_ROLE;
export const KardIssuerAwsRole = KARD_ISSUER_AWS_ROLE;
export const KardAwsEnv = KARD_AWS_ENV;

export class KardClient extends SdkClient {
  private _client: AxiosInstance;

  constructor() {
    super('Kard');
  }

  protected _init() {
    const error = validateEnvironmentVariables();
    if (error) {
      throw error;
    }

    this._client = axios.create({
      headers: {
        'Content-Type': 'application/json',
      },
      baseURL: KARD_API_URL,
    });
  }

  public withHttpClient(client: AxiosInstance) {
    if (!client) {
      return;
    }
    this._client = client;
  }

  public async getSessionToken(): Promise<GetSessionTokenResponse> {
    try {
      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${KARD_ISSUER_CLIENT_HASH}`,
      };
      const { data } = await this._client({
        url: '/oauth2/token?grant_type=client_credentials',
        baseURL: KARD_COGNITO_URL,
        method: 'post',
        headers,
      });
      return data;
    } catch (err) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        console.error(`Kard session token request failed: ${(err as AxiosError).toJSON()}`);
      }
      throw asCustomError(err);
    }
  }

  public async verifyWebhookSignature(body: string, signature: string): Promise<Error | null> {
    try {
      const key = KARD_ISSUER_WEBHOOK_KEY;

      const hash = createHmac('sha256', key).update(body).digest('base64');
      if (crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature))) {
        return null;
      }

      return KardInvalidSignatureError;
    } catch (err) {
      console.error(err);
      return KardServerError;
    }
  }

  // accept a session token or get one if not provided
  public async createUser(req: CreateUserRequest, token?: KardAccessToken): Promise<AxiosResponse<any>> {
    if (!token) {
      const sessionToken = await this.getSessionToken();
      if (!sessionToken) throw new Error('Unable to get session token');
      token = sessionToken.access_token;
    }
    if (!!req?.cardInfo) {
      req.cardInfo.issuer = KARD_ISSUER_ISSUER_NAME;
    }
    try {
      const data = await this._client.post('/users/users', { ...req }, { headers: { Authorization: token } });
      return data;
    } catch (err) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        console.error(`Kard user creation request failed: ${(err as AxiosError).toJSON()}`);
      }
      throw asCustomError(err);
    }
  }

  public async addCardToUser(req: AddCardToUserRequest, token?: KardAccessToken): Promise<AddCardToUserResponse> {
    if (!token) {
      const sessionToken = await this.getSessionToken();
      if (!sessionToken) throw new Error('Unable to get session token');
      token = sessionToken.access_token;
    }
    if (!!req?.cardInfo) {
      req.cardInfo.issuer = KARD_ISSUER_ISSUER_NAME;
    }
    try {
      const { data }: AxiosResponse<AddCardToUserResponse, any> = await this._client.post(
        `/users/users/${req.referringPartnerUserId}/cards`,
        { ...req },
        { headers: { Authorization: token } },
      );
      return data;
    } catch (err) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        console.error(`Unable to add card to user: ${(err as AxiosError).toJSON()}`);
      }
      throw asCustomError(err);
    }
  }

  public async deleteUser(userId: string, token?: KardAccessToken): Promise<AxiosResponse<{}, any>> {
    if (!token) {
      const sessionToken = await this.getSessionToken();
      if (!sessionToken) throw new Error('Unable to get session token');
      token = sessionToken.access_token;
    }
    try {
      const data: AxiosResponse<{}, any> = await this._client.delete(`/users/users/${userId}/`, {
        headers: { Authorization: token },
      });
      return data;
    } catch (err) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        console.error(`Unable to delete user: ${(err as AxiosError).toJSON()}`);
      }
      throw asCustomError(err);
    }
  }

  public async updateUser(req: UpdateUserRequest, token?: KardAccessToken): Promise<AxiosResponse<any>> {
    if (!token) {
      const sessionToken = await this.getSessionToken();
      if (!sessionToken) throw new Error('Unable to get session token');
      token = sessionToken.access_token;
    }
    try {
      const data: AxiosResponse<{}, any> = await this._client.put(
        `/users/users/${req.referringPartnerUserId}/`,
        { ...req },
        { headers: { Authorization: token } },
      );
      return data;
    } catch (err) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        console.error(`Unable to update user: ${(err as AxiosError).toJSON()}`);
      }
      throw asCustomError(err);
    }
  }

  public async queueTransactionsForProcessing(req: QueueTransactionsRequest, token?: KardAccessToken): Promise<AxiosResponse<any>> {
    if (!token) {
      const sessionToken = await this.getSessionToken();
      if (!sessionToken) throw new Error('Unable to get session token');
      token = sessionToken.access_token;
    }
    try {
      const data: AxiosResponse<{}, any> = await this._client.post('/transactions/incoming/', req, {
        headers: { Authorization: token },
      });
      return data;
    } catch (err) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        console.error(`Unable to queue transactions for processing: ${(err as AxiosError).toJSON()}`);
      }
      throw asCustomError(err);
    }
  }

  public async getRewardsMerchantById(id: string, token?: KardAccessToken): Promise<Merchant> {
    if (!token) {
      const sessionToken = await this.getSessionToken();
      if (!sessionToken) throw new Error('Unable to get session token');
      token = sessionToken.access_token;
    }
    try {
      const { data } = await this._client.get(`/rewards/merchant/${id}`, {
        headers: { Authorization: token },
      });
      return data;
    } catch (err) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        console.error(`Error Fetching Merchant with id ${id}: ${(err as AxiosError).toJSON()}`);
      }
      throw asCustomError(err);
    }
  }

  public async getRewardsMerchants(pagination?: PaginationFields, token?: KardAccessToken): Promise<GetRewardsMerchantsResponse> {
    if (!token) {
      const sessionToken = await this.getSessionToken();
      if (!sessionToken) throw new Error('Unable to get session token');
      token = sessionToken.access_token;
    }
    try {
      const queryParams = { ...pagination };
      const { data } = await this._client.get('/rewards/merchant/', {
        headers: { Authorization: token },
        params: queryParams,
      });
      return data;
    } catch (err) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        console.error(`Error Fetching Merchant Rewards: ${(err as AxiosError).toJSON()}`);
      }
      throw asCustomError(err);
    }
  }

  public async getLocationById(locationId: string, token?: KardAccessToken): Promise<AxiosResponse<KardMerchantLocation>> {
    if (!token) {
      const sessionToken = await this.getSessionToken();
      if (!sessionToken) throw new Error('Unable to get session token');
      token = sessionToken.access_token;
    }
    try {
      const res = await this._client.get(`/rewards/merchant/location/${locationId}`, {
        headers: { Authorization: token },
      });
      return res;
    } catch (err) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        console.error(`Error Fetching Locations By Id: ${(err as AxiosError).toJSON()}`);
      }
      throw asCustomError(err);
    }
  }

  public async getLocationsByMerchantId(req: GetLocationsByMerchantIdRequest, token?: KardAccessToken): Promise<AxiosResponse<KardMerchantLocations>> {
    if (!token) {
      const sessionToken = await this.getSessionToken();
      if (!sessionToken) throw new Error('Unable to get session token');
      token = sessionToken.access_token;
    }
    try {
      const queryParams = { ...req };
      delete queryParams.id;
      const res = await this._client.get(`/rewards/merchant/locations/${req.id}`, {
        headers: { Authorization: token },
        params: queryParams,
      });
      return res;
    } catch (err) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        console.error(`Error Fetching Locations By Merchant Id: ${(err as AxiosError).toJSON()}`);
      }
      throw asCustomError(err);
    }
  }

  public async getLocations(req: GetLocationsRequest, token?: KardAccessToken): Promise<AxiosResponse<KardMerchantLocations>> {
    if (!token) {
      const sessionToken = await this.getSessionToken();
      if (!sessionToken) throw new Error('Unable to get session token');
      token = sessionToken.access_token;
    }
    try {
      const res = await this._client.get('/rewards/merchant/locations', {
        headers: { Authorization: token },
        params: req,
      });
      return res;
    } catch (err) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        console.error(`Error Fetching Locations: ${(err as AxiosError).toJSON()}`);
      }
      throw asCustomError(err);
    }
  }

  public async getEligibleLocations(req: GetEligibleLocationsRequest, token?: KardAccessToken): Promise<AxiosResponse<KardMerchantLocations>> {
    if (!token) {
      const sessionToken = await this.getSessionToken();
      if (!sessionToken) throw new Error('Unable to get session token');
      token = sessionToken.access_token;
    }
    try {
      const queryParams = { ...req };
      delete queryParams.referringPartnerUserId;

      const res = await this._client.get(`/rewards/merchant/locations/user/${req.referringPartnerUserId}`, {
        headers: { Authorization: token },
        params: queryParams,
      });
      return res;
    } catch (err) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        console.error(`Error Fetching Eligible Locations: ${(err as AxiosError).toJSON()}`);
      }
      throw asCustomError(err);
    }
  }
}
