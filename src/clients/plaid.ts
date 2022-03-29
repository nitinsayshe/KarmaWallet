/* eslint-disable camelcase */
import {
  Configuration, PlaidApi, PlaidEnvironments, LinkTokenCreateRequest, CountryCode, Products, TransactionsGetRequest, ItemPublicTokenExchangeRequest,
} from 'plaid';
import pino from 'pino';
import { ErrorTypes, CardStatus } from '../lib/constants';
import CustomError, { asCustomError } from '../lib/customError';
import { sleep } from '../lib/misc';
import { CardModel } from '../models/card';
import { SdkClient } from './sdkClient';

const logger = pino();

export interface ICreateLinkTokenParams {
  userId: string;
  access_token?: string;
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
      throw asCustomError(e);
    }
  };

  exchangePublicTokenForAccessToken = async ({ public_token }: ItemPublicTokenExchangeRequest) => {
    if (!public_token) throw new CustomError('A public token is required.', ErrorTypes.INVALID_ARG);
    try {
      const response = await this._client.itemPublicTokenExchange({ public_token });
      const accessToken = response.data.access_token;
      const itemId = response.data.item_id;
      return { accessToken, itemId };
    } catch (e) {
      throw asCustomError(e);
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
        // TODO: update so we can be notified if this happens and we can manually fix.
        logger.error(err);
      }

      if (!!e.response.data.error_message) {
        logger.error(e.response.data.error_message);
      } else {
        console.log('[-] getPlaidTransactions error');
        console.log(e);
      }
    }
  };
}
