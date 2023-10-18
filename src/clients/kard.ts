import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import crypto, { createHmac } from 'crypto';
import { StateAbbreviation } from '../lib/constants';
import { asCustomError } from '../lib/customError';
import { SdkClient } from './sdkClient';

const { KARD_API_URL, KARD_COGNITO_URL, KARD_CLIENT_HASH, KARD_ISSUER_NAME, KARD_WEBHOOK_KEY } = process.env;

export const KardIssuer = KARD_ISSUER_NAME;

export enum RewardType {
  'CARDLINKED' = 'CARDLINKED',
  'AFFILIATE' = 'AFFILIATE',
}

export enum RewardStatus {
  'APPROVED' = 'APPROVED',
  'SETTLED' = 'SETTLED',
}

export enum TransactionStatus {
  'APPROVED' = 'APPROVED',
  'SETTLED' = 'SETTLED',
  'REVERSED' = 'REVERSED',
  'DECLINED' = 'DECLINED',
  'RETURNED' = 'RETURNED',
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
  description: string; // merchant name
  description2?: string;
  coreProviderId?: string; // name of processor
  mcc?: string; // merchant category code
  transactionDate?: string; // timestamp required for REVERSED, DECLINED, RETURNED status - do not include if settled
  authorizationDate?: string; // timestamp required for APPROVED status
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
  cardBIN?: string; // valid BIN of 6 digits. If over 6, send only the first 6 digits of the card number
  cardLastFour?: string;
  googleId?: string;
};

export type AffiliateTransactionData = {
  offerId: string;
  total: number;
  identifier: string;
  quantity: number;
  amount: number;
  description: string;
  category: string; // Baseline by default
  commissionToIssuer: number; // commission to Karma Wallet
};

export type EarnedReward = {
  merchantId: string;
  name: string; // merchant name
  type: RewardType;
  status: RewardStatus;
  commissionToIssuer: number; // commission to Karma Wallet
};

export type EarnedRewardTransaction = {
  issuerTransactionId: string; // id that is added when we send the transaction to kard
  transactionId: string; // only for affiliates
  transactionAmountInCents: number;
  status: TransactionStatus;
  itemsOrdered: Partial<AffiliateTransactionData>[];
  transactionTimeStamp: string;
};

export type EarnedRewardWebhookBody = {
  issuer: string; // should always be KARD_ISSUER_NAME
  user: {
    referringPartnerUserId: string; // UserMode.integrations.kard.userId -- a uuuid
  };
  reward: EarnedReward;
  card: {
    bin: string;
    last4: string;
    network: string;
  };
  transaction: EarnedRewardTransaction;
  postDineInLinkURL: string;
  error: any;
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
  enrolledRewards?: RewardType[]; // empty array to remove all rewards
};

export type CreateUserRequest = {
  email: string;
  userName: string;
  referringPartnerUserId: string;
  firstName?: string;
  lastName?: string;
  zipCode?: string;
  cardInfo?: CardInfo;
  enrolledRewards?: RewardType[];
};

export enum MerchantSource {
  LOCAL = 'LOCAL',
  NATIONAL = 'NATIONAL',
}

export enum CardNetwork {
  Visa = 'VISA',
  Mastercard = 'MASTERCARD',
  Amex = 'AMERICAN EXPRESS',
  Discover = 'DISCOVER',
}
export enum OfferType {
  INSTORE = 'INSTORE',
  ONLINE = 'ONLINE',
}

export enum OfferSource {
  LOCAL = 'LOCAL',
  NATIONAL = 'NATIONAL',
}

export enum CommissionType {
  PERCENT = 'PERCENT',
  FLAT = 'FLAT',
}

export type Offer = {
  _id: string;
  name: string;
  merchantId: string;
  merchantLocationIds?: string[]; // locatin ids when isLocationSpecific is true
  offerType: OfferType;
  source: OfferSource;
  commissionType: CommissionType;
  isLocationSpecific: boolean;
  optInRequired: boolean;
  terms: string;
  expirationDate: string;
  createdDate: string;
  lastModified: string;
  totalCommission: number;
  minRewardAmount: number;
  maxRewardAmount: number;
  minTransactionAmount: number;
  maxTransactionAmount: number;
  redeemableOnce: boolean;
};

export type Merchant = {
  _id: string;
  name: string;
  source: MerchantSource;
  description: string;
  imgUrl: string;
  bannerImgUrl: string;
  websiteURL: string;
  acceptedCards: CardNetwork[];
  category: string;
  createdDate: string;
  lastModified: string;
  offers: Offer[];
};

export type GetRewardsMerchantsResponse = Merchant[];

export const KardServerError = new Error('Bad Request');
export const KardInvalidSignatureError = new Error('Invalid Signature');

export const verifyWebhookSignature = (body: EarnedRewardWebhookBody, signature: string): Error | null => {
  try {
    const stringified = JSON.stringify(body);

    const hash = createHmac('sha256', KARD_WEBHOOK_KEY).update(stringified).digest('base64');
    if (crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature))) {
      return null;
    }

    return KardInvalidSignatureError;
  } catch (err) {
    console.error(err);
    return KardServerError;
  }
};

const validateEnvironmentVariables = (): Error | null => {
  const loadingErrorPrefix = 'Error Loading Kard Environment Variables: ';
  if (!KARD_API_URL) {
    return new Error(`${loadingErrorPrefix}KARD_API_URL not found`);
  }
  if (!KARD_COGNITO_URL) {
    return new Error(`${loadingErrorPrefix}KARD_COGNITO_URL not found`);
  }
  if (!KARD_CLIENT_HASH) {
    return new Error(`${loadingErrorPrefix}KARD_CLIENT_HASH not found`);
  }
  if (!KARD_ISSUER_NAME) {
    return new Error(`${loadingErrorPrefix}KARD_ISSUER_NAME not found`);
  }
  if (!KARD_WEBHOOK_KEY) {
    return new Error(`${loadingErrorPrefix}KARD_WEBHOOK_KEY not found`);
  }
  return null;
};

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
        Authorization: `Basic ${KARD_CLIENT_HASH}`,
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

  // accept a session token or get one if not provided
  public async createUser(req: CreateUserRequest, token?: KardAccessToken): Promise<AxiosResponse<{}, any>> {
    if (!token) {
      const sessionToken = await this.getSessionToken();
      if (!sessionToken) throw new Error('Unable to get session token');
      token = sessionToken.access_token;
    }
    if (!!req?.cardInfo) {
      req.cardInfo.issuer = KardIssuer;
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
      req.cardInfo.issuer = KardIssuer;
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

  public async updateUser(req: UpdateUserRequest, token?: KardAccessToken): Promise<AxiosResponse<{}, any>> {
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

  public async queueTransactionsForProcessing(
    req: QueueTransactionsRequest,
    token?: KardAccessToken,
  ): Promise<AxiosResponse<{}, any>> {
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

  public async getRewardsMerchants(token?: KardAccessToken): Promise<GetRewardsMerchantsResponse> {
    if (!token) {
      const sessionToken = await this.getSessionToken();
      if (!sessionToken) throw new Error('Unable to get session token');
      token = sessionToken.access_token;
    }
    try {
      const { data } = await this._client.get('/rewards/merchant/', {
        headers: { Authorization: token },
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
}
