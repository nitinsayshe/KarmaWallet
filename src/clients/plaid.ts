/* eslint-disable camelcase */
import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  LinkTokenCreateRequest,
  CountryCode,
  Products,
  TransactionsGetRequest,
  ItemPublicTokenExchangeRequest,
  SandboxItemFireWebhookRequestWebhookCodeEnum,
  SandboxPublicTokenCreateRequest,
  WebhookVerificationKeyGetRequest,
} from 'plaid';
import pino from 'pino';
import jsonwebtoken from 'jsonwebtoken';
import jwkToPem from 'jwk-to-pem';
import crypto from 'crypto';
import dayjs from 'dayjs';
import { ErrorTypes, CardStatus } from '../lib/constants';
import CustomError, { asCustomError } from '../lib/customError';
import { sleep } from '../lib/misc';
import { CardModel } from '../models/card';
import { SdkClient } from './sdkClient';
import PlaidUser from '../integrations/plaid/user';

const logger = pino();

// example of error object from Plaid API
/**
 * {
    display_message: null,
    documentation_url: 'https://plaid.com/docs/?ref=error#invalid-input-errors',
    error_code: 'INVALID_ACCESS_TOKEN',
    error_message: 'provided access token is in an invalid format. expected format: access-<environment>-<identifier>',
    error_type: 'INVALID_INPUT',
    request_id: 'mZIOF87AxqqJvKa',
    suggested_action: null
  }
 */
export interface IPlaidErrorResponse {
  response: {
    status?: number;
    data: {
      display_message: string;
      documentation_url: string;
      error_code: string;
      error_message: string;
      error_type: string;
      request_id: string;
      suggested_action: string;
    }
  }
}

export interface IPlaidWebhookJWTPayload {
  'iat': number;
  'request_body_sha256': string;
}
export interface ICreateLinkTokenParams {
  userId: string;
  access_token?: string;
}

export interface ISandboxItemFireWebhookRequest {
  webhook_code: SandboxItemFireWebhookRequestWebhookCodeEnum;
  access_token: string;
}

export interface IVerifyWebhookParams {
  signedJwt: string;
  requestBody: any;
}

export interface IExchangePublicTokenForAccessTokenParams {
  public_token: string;
  userId: string;
}

export class PlaidClient extends SdkClient {
  _client: PlaidApi;

  constructor() {
    super('Plaid');
  }

  protected _init() {
    const { PLAID_SECRET, PLAID_CLIENT_ID } = process.env;
    const PLAID_ENV = process.env.PLAID_ENV || 'sandbox';
    const configuration = new Configuration({
      basePath: PlaidEnvironments[PLAID_ENV],
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
          'PLAID-SECRET': PLAID_SECRET,
          'Plaid-Version': '2020-09-14',
        },
      },
    });
    this._client = new PlaidApi(configuration);
  }

  handlePlaidError = (e: IPlaidErrorResponse) => {
    if (e?.response?.data) {
      const { error_code, error_message } = e.response.data;
      throw new CustomError(error_message, { name: error_code, code: e?.response?.status || ErrorTypes.SERVICE.code });
    }
    throw asCustomError(e);
  };

  createLinkToken = async ({ userId, access_token }: ICreateLinkTokenParams) => {
    if (!userId) throw new CustomError('A userId is required to create a link token', ErrorTypes.INVALID_ARG);
    const configs: LinkTokenCreateRequest = {
      user: {
        client_user_id: userId,
      },
      client_name: 'Karma Wallet',
      country_codes: [CountryCode.Us],
      language: 'en',
      redirect_uri: process.env.PLAID_REDIRECT_URI,
      webhook: process.env.PLAID_WEBHOOK_URI,
    };
    // accessToken provided if launching link in update mode
    if (access_token) {
      configs.access_token = access_token;
    }
    // products should be excluded if launching link in update mode
    if (!access_token) {
      configs.products = [Products.Transactions];
    }
    try {
      const response = await this._client.linkTokenCreate(configs);
      return { userId, ...response.data };
    } catch (e) {
      this.handlePlaidError(e as IPlaidErrorResponse);
    }
  };

  exchangePublicTokenForAccessToken = async ({ public_token, userId }: IExchangePublicTokenForAccessTokenParams) => {
    if (!public_token) throw new CustomError('A public token is required.', ErrorTypes.INVALID_ARG);
    try {
      const response = await this._client.itemPublicTokenExchange({ public_token });
      const accessToken = response.data.access_token;
      const itemId = response.data.item_id;
      // transactions will not be available at this point
      // account data should be available at this point
      const endDate = dayjs();
      // date in past is arbitrary
      const startDate = endDate.subtract(90, 'day');
      const transactionDataResponse = await this._client.transactionsGet({
        access_token: accessToken,
        start_date: startDate.format('YYYY-MM-DD'),
        end_date: endDate.format('YYYY-MM-DD'),
      });
      const plaidItem = { ...transactionDataResponse.data, userId };
      const plaidUserInstance = new PlaidUser(plaidItem);
      await plaidUserInstance.load();
      await plaidUserInstance.addCards(plaidItem, true);
      return {
        message: 'Successfully linked plaid account',
        itemId,
      };
    } catch (e) {
      throw asCustomError(e);
    }
  };

  // used to invalidate an access token and retreive another one (essentially a token refresh/rotation)
  invalidateAccessToken = async ({ access_token }: { access_token: string }) => {
    if (!access_token) throw new CustomError('An access token is required.', ErrorTypes.INVALID_ARG);
    try {
      const response = await this._client.itemAccessTokenInvalidate({ access_token });
      return response.data;
    } catch (e) {
      this.handlePlaidError(e as IPlaidErrorResponse);
    }
  };

  getItem = async (accessToken: string) => {
    const response = await this._client.itemGet({ access_token: accessToken });
    return response.data.item;
  };

  removeItem = async ({ access_token }: { access_token: string }) => {
    if (!access_token) throw new CustomError('An access token is required.', ErrorTypes.INVALID_ARG);
    try {
      const response = await this._client.itemRemove({ access_token });
      return response.data;
    } catch (e) {
      this.handlePlaidError(e as IPlaidErrorResponse);
    }
  };

  getPlaidTransactions = async ({ access_token, start_date, end_date }: TransactionsGetRequest) => {
    if (!access_token) throw new CustomError('An access token is required.', ErrorTypes.INVALID_ARG);
    // the number of transactions to retrieve in
    // each request/
    const count = 500;

    const request = {
      access_token,
      start_date,
      end_date,
      options: { count },
    };
    try {
      const response = await this._client.transactionsGet(request);

      let { transactions } = response.data;
      const { total_transactions: totalTransactions } = response.data;

      // plaid rate limits are set to 30 requests per minute
      // per plaid item. if there are more than (count * 30)
      // transactions for a given plaid item, then we will
      // need to throttle our requests for that specicific item
      //
      // https://plaid.com/docs/errors/rate-limit-exceeded/#troubleshooting-steps-5
      const throttle = totalTransactions >= (count * 29);

      while (transactions.length < totalTransactions) {
        const paginatedRequest = {
          ...request,
          options: {
            count,
            offset: transactions.length,
          },
        };
        if (throttle) await sleep(Math.ceil((60 / 29) * 1000));
        const paginatedResponse = await this._client.transactionsGet(paginatedRequest);
        transactions = transactions.concat(
          paginatedResponse.data.transactions,
        );
      }
      return transactions;
    } catch (e: any) {
      console.log('[-] error getting plaid transactions.');

      if (e.response?.data?.error_code === 'INVALID_ACCESS_TOKEN') {
        try {
          const cards = await CardModel.find({ 'integrations.plaid.accessToken': access_token });
          if (!!cards.length) {
            for (const card of cards) {
              card.status = CardStatus.Unlinked;
              card.integrations.plaid.unlinkedAccessTokens.push(card.integrations.plaid.accessToken);
              card.integrations.plaid.accessToken = null;
              await card.save();
            }
          }
        } catch (err) {
          console.log('[-] error unlinking card');
          // TODO: update so we can be notified if this happens and we can manually fix.
          logger.error(err);
        }
      }

      if (!!e.response?.data) {
        logger.error(e.response.data);
      } else {
        console.log(e);
      }
    }
  };

  sandboxCreatePublicToken = async (institutionId = 'ins_3') => {
    const configs: SandboxPublicTokenCreateRequest = {
      institution_id: institutionId,
      initial_products: [Products.Transactions],
    };
    try {
      const publicTokenResponse = await this._client.sandboxPublicTokenCreate(configs);
      return publicTokenResponse.data.public_token;
    } catch (e) {
      this.handlePlaidError(e as IPlaidErrorResponse);
    }
  };

  sandboxExchangePublicToken = async (publicToken: string) => {
    try {
      const exchangeRequest: ItemPublicTokenExchangeRequest = {
        public_token: publicToken,
      };
      const exchangeTokenResponse = await this._client.itemPublicTokenExchange(exchangeRequest);
      return exchangeTokenResponse.data.access_token;
    } catch (e) {
      this.handlePlaidError(e as IPlaidErrorResponse);
    }
  };

  sandboxFireTestWebhook = async ({
    access_token,
    webhook_code = SandboxItemFireWebhookRequestWebhookCodeEnum.DefaultUpdate,
  }: ISandboxItemFireWebhookRequest) => {
    try {
      if (!access_token) throw new CustomError('An access token is required.', ErrorTypes.INVALID_ARG);
      return this._client.sandboxItemFireWebhook({ access_token, webhook_code });
    } catch (e) {
      this.handlePlaidError(e as IPlaidErrorResponse);
    }
  };

  // https://plaid.com/docs/api/webhooks/webhook-verification/
  verifyWebhook = async ({ signedJwt, requestBody }: IVerifyWebhookParams) => {
    try {
      const decodedToken = jsonwebtoken.decode(signedJwt, { complete: true });

      const { kid: key_id, alg } = decodedToken.header;
      if (alg !== 'ES256') throw new CustomError('Invalid algorithm', ErrorTypes.SERVICE);
      const verificationKeyRequest: WebhookVerificationKeyGetRequest = {
        key_id,
      };
      const verificationKeyResponse = await this._client.webhookVerificationKeyGet(verificationKeyRequest);
      const { key } = verificationKeyResponse.data;
      if (!key) throw new CustomError('Plaid webhook key not found', ErrorTypes.SERVICE);

      // Reject expired keys
      if (key.expired_at != null) throw new CustomError('Expired key', ErrorTypes.SERVICE);
      const pem = jwkToPem(key as jwkToPem.EC);

      // verification will throw error if the signature is invalid
      jsonwebtoken.verify(signedJwt, pem, { algorithms: ['ES256'], maxAge: '5 minutes' });

      // verify the request body
      const bodyHash = crypto.createHash('sha256').update(requestBody).digest('hex');
      const claimedBodyHash = (decodedToken.payload as IPlaidWebhookJWTPayload).request_body_sha256;
      if (!crypto.timingSafeEqual(Buffer.from(bodyHash), Buffer.from(claimedBodyHash))) {
        throw new CustomError('Invalid request body', ErrorTypes.SERVICE);
      }
    } catch (e) {
      this.handlePlaidError(e as IPlaidErrorResponse);
    }
  };
}
