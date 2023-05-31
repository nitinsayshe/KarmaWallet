import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import { StateAbbreviation } from '../lib/constants';
import { asCustomError } from '../lib/customError';
import { SdkClient } from './sdkClient';

const { KARD_API_URL, KARD_COGNITO_URL, KARD_CLIENT_HASH } = process.env;

const enum EnrolledReward {
  'CARDLINKED',
  'AFFILIATE',
}

const enum TransactionStatus {
  'APPROVED',
  'SETTLED',
  'REVERSED',
  'DECLINED',
  'RETURNED',
}

export type KardAccessToken = string;

export type GetSessionTokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
};

export type Transaction = {
  transactionId: string;
  referringPartnerUserId: string;
  amount: number; // in cents
  status: TransactionStatus;
  currency: string;
  description: string;
  description2?: string;
  coreProviderId?: string; // name of processor
  msc?: string; // merchant category code
  transactionDate: string; // timestamp required for REVERSED, DECLINED, RETURNED status
  authorizationDate: string; // timestamp required for APPROVED status
  settledDate?: string; // timestamp required for SETTLED status
  merchantId?: string; // Acquirer Merchant ID (MID)
  merchantStoreId?: string;
  cardPresence?: string;
  merchantName?: string;
  merchantAddrCity?: string;
  merchantAddrState?: StateAbbreviation;
  merchantAddrZipCode?: string;
  merchantAddrCountry?: string;
  merchantAddrStreet?: string;
  merchantLat?: number;
  merchantLong?: number;
  panEntryMode?: string;
  cardBIN: string; // valid BIN of 6 digits. If over 6, send only the first 6 digits of the card number
  cardLastFour: string;
  googleId?: string;
};

export type QueueTransactionsRequest = Transaction[];

export type CardInfo = {
  last4: string;
  bin: string;
  issuer: string;
  network: string;
};

export type AddCardToUserResponse = {
  email: string;
  id: string;
  userName: string;
  firstName: string;
  lastName: string;
  zipCode: string;
  referringPartner: string;
  referringPartnerUserId: string; // change this one to update the id
  cards: CardInfo[];
};

export type AddCardToUserRequest = {
  referringPartnerUserId: string;
  cardInfo: CardInfo;
};

export type UpdateUserRequest = {
  referringPartnerUserId: string;
  email?: string;
  userName?: string;
  firstName?: string;
  lastName?: string;
  zipCode?: string;
  enrolledRewards?: EnrolledReward[]; // empty array to remove all rewards
};

export type CreateUserRequest = {
  email: string;
  userName: string;
  referringPartnerUserId: string;
  firstName?: string;
  lastName?: string;
  zipCode?: string;
  cardInfo?: CardInfo;
  enrolledRewards?: EnrolledReward[];
};

export class KardClient extends SdkClient {
  private _client: AxiosInstance;

  constructor() {
    super('Kard');
  }

  protected _init() {
    if (!KARD_COGNITO_URL || !KARD_API_URL || !KARD_CLIENT_HASH) {
      throw new Error('Kard credentials not found');
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
        Authorization: `Basic ${KARD_CLIENT_HASH}`,
      };
      const { data } = await this._client({
        url: '/oauth2/token?grant_type=client_credentials',
        baseURL: KARD_COGNITO_URL,
        method: 'post',
        headers,
      });
      console.log(JSON.stringify(data, null, 2));
      return data;
    } catch (err) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        console.error(`Kard session token request failed: ${(err as AxiosError).toJSON()}`);
      }
      throw asCustomError(err);
    }
  }

  // accept a session token or get one if not provided
  public async createUser(req: CreateUserRequest, token?: KardAccessToken): Promise<AxiosResponse<{}, any>> {
    if (!token) {
      const sessionToken = await this.getSessionToken();
      token = sessionToken.access_token;
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
      token = sessionToken.access_token;
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

  public async updateUser(req: UpdateUserRequest, token?: KardAccessToken): Promise<AxiosResponse<{}, any>> {
    if (!token) {
      const sessionToken = await this.getSessionToken();
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

  public async queueTransactionsForProcessing(
    req: QueueTransactionsRequest,
    token?: KardAccessToken,
  ): Promise<AxiosResponse<{}, any>> {
    if (!token) {
      const sessionToken = await this.getSessionToken();
      token = sessionToken.access_token;
    }
    try {
      const data: AxiosResponse<{}, any> = await this._client.put(
        '/transactions/incoming/',
        { ...req },
        { headers: { Authorization: token } },
      );
      return data;
    } catch (err) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        console.error(`Unable to queue transactions for processing: ${(err as AxiosError).toJSON()}`);
      }
      throw asCustomError(err);
    }
  }
}
