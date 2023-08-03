/* eslint-disable camelcase */
import crypto from 'crypto';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import jsonwebtoken from 'jsonwebtoken';
import jwkToPem from 'jwk-to-pem';
import pino from 'pino';
import {
  Configuration, CountryCode, ItemPublicTokenExchangeRequest, LinkTokenCreateRequest, PlaidApi,
  PlaidEnvironments, ProcessorTokenCreateRequestProcessorEnum, Products, SandboxItemFireWebhookRequestWebhookCodeEnum,
  SandboxPublicTokenCreateRequest, Transaction, TransactionsGetRequest, WebhookVerificationKeyGetRequest,
} from 'plaid';
import { getCustomFieldIDsAndUpdateSetFields, setLinkedCardData } from '../integrations/activecampaign';
import { IPlaidLinkOnSuccessMetadata } from '../integrations/plaid/types';
import PlaidUser from '../integrations/plaid/user';
import { CardStatus, ErrorTypes } from '../lib/constants';
import CustomError, { asCustomError } from '../lib/customError';
import { sleep } from '../lib/misc';
import { CardModel } from '../models/card';
import { SdkClient } from './sdkClient';

dayjs.extend(utc);

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
  app?: boolean;
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
  metadata: IPlaidLinkOnSuccessMetadata;
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
    } else {
      throw asCustomError(e);
    }
  };

  getProcessorToken = async (accessToken: string) => {
    try {
      const { data } = await this._client.accountsGet({ access_token: accessToken });
      const config = {
        access_token: accessToken,
        account_id: data.accounts[0].account_id,
        processor: ProcessorTokenCreateRequestProcessorEnum.Marqeta,
      };
      // Get the processor token from plaid
      const processorTokenResponse = await this._client.processorTokenCreate(config);
      const processorToken = processorTokenResponse.data.processor_token;
      return processorToken;
    } catch (e) {
      // Handle the error here or throw it to be handled elsewhere
      this.handlePlaidError(e as IPlaidErrorResponse);
    }
  };

  createLinkToken = async ({ userId, access_token, app }: ICreateLinkTokenParams) => {
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
      configs.products = [Products.Transactions, Products.Auth];

      // if request is coming from web set products to Transactions only
      if (!app) {
        configs.products = [Products.Transactions];
      }
    }
    try {
      const response = await this._client.linkTokenCreate(configs);
      return { userId, ...response.data };
    } catch (e) {
      this.handlePlaidError(e as IPlaidErrorResponse);
    }
  };

  exchangePublicTokenForAccessToken = async ({ public_token, userId, metadata }: IExchangePublicTokenForAccessTokenParams) => {
    if (!public_token) throw new CustomError('A public token is required.', ErrorTypes.INVALID_ARG);
    try {
      const response = await this._client.itemPublicTokenExchange({ public_token });
      const accessToken = response.data.access_token;
      const itemId = response.data.item_id;
      const plaidItem = { ...metadata, public_token, item_id: itemId, access_token: accessToken, userId };
      const plaidUserInstance = new PlaidUser(plaidItem);
      await plaidUserInstance.load();

      // if accounts is empty generete a preocessor token
      if (!plaidItem.accounts) {
        const processorToken = await this.getProcessorToken(accessToken);
        return {
          message: 'Processor token successfully generated',
          itemId,
          processorToken,
        };
      }
      await plaidUserInstance.addCards(plaidItem, true);
      return {
        message: 'Successfully linked plaid account',
        itemId,
      };
    } catch (e) {
      this.handlePlaidError(e as IPlaidErrorResponse);
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

  getPlaidTransactions = async ({ access_token, start_date, end_date }: TransactionsGetRequest): Promise<Transaction[]> => {
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
      // TODO: update card status here...need to look at possible errors from Plaid.
      // ??? send email to user advising that one or more of their cards has become unlinked ???
      console.log('[-] error getting plaid transactions.');
      /*
        plaid error codes don't distinguish between errors caused by environments
        and those caused by the item no longer being linked/authorized, so reading
        the error code isn't enough to determine if the item is no longer linked.
      */
      if (e.response?.data?.error_message.includes('provided access token is for the wrong Plaid environment')) {
        console.log('[-] plaid environment mismatch. skipping access token.');
        return null;
      }
      if (['INVALID_ACCESS_TOKEN', 'ITEM_LOGIN_REQUIRED'].includes(e.response?.data?.error_code)) {
        try {
          const cards = await CardModel.find({ 'integrations.plaid.accessToken': access_token });
          if (!!cards.length) {
            for (const card of cards) {
              card.status = CardStatus.Unlinked;
              card.integrations.plaid.unlinkedAccessTokens.push(card.integrations.plaid.accessToken);
              card.integrations.plaid.accessToken = null;
              card.lastTransactionSync = dayjs().utc().toDate();
              card.lastModified = dayjs().utc().toDate();
              card.unlinkedDate = dayjs().utc().toDate();
              await card.save();
            }
            // update card data in active campaign
            await getCustomFieldIDsAndUpdateSetFields(cards[0].userId.toString(), setLinkedCardData);
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
      options: {
        webhook: process.env.PLAID_WEBHOOK_URI,
      },
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
      // body must be hashed with tab spacing of 2: https://stackoverflow.com/questions/62117400/hashing-plaid-request-body-webhook
      const bodyHash = crypto.createHash('sha256').update(JSON.stringify(requestBody, null, 2)).digest('hex');
      const claimedBodyHash = (decodedToken.payload as IPlaidWebhookJWTPayload).request_body_sha256;
      if (!crypto.timingSafeEqual(Buffer.from(bodyHash), Buffer.from(claimedBodyHash))) {
        throw new CustomError('Invalid request body', ErrorTypes.SERVICE);
      }
    } catch (e) {
      this.handlePlaidError(e as IPlaidErrorResponse);
    }
  };
}
