/* eslint-disable camelcase */
import axios, { AxiosInstance } from 'axios';
import { asCustomError } from '../lib/customError';
import { IPaypalUserIntegration } from '../models/user';
import { SdkClient } from './sdkClient';

const {
  PAYPAL_CLIENT_ID,
  PAYPAL_CLIENT_SECRET,
  PAYPAL_MODE,
} = process.env;

export interface ISendPayoutBatchHeader {
  sender_batch_header: {
    sender_batch_id: string;
    email_subject: string;
    email_message: string;
  }
}
// https://developer.paypal.com/docs/api/payments.payouts-batch/v1/#definition-payout_item
export interface ISendPayoutBatchItem {
  recipient_type: 'PAYPAL_ID';
  amount: {
    value: string;
    currency: string;
  }
  receiver: string;
  note: string;
  sender_item_id: string;
}

export interface IPaypalBalance {
  currency: string,
  primary?: boolean,
  total_balance: {
    currency_code: string,
    value: string
  },
  available_balance: {
    currency_code: string,
    value: string
  },
  withheld_balance: {
    currency_code: string,
    value: string
  }
}

export class PaypalClient extends SdkClient {
  _client: AxiosInstance;

  constructor() {
    super('Paypal');
  }

  protected _init() {
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET || !PAYPAL_MODE) throw new Error('Paypal credentials not found');
    const base64Credentials = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
    this._client = axios.create({
      headers: {
        Authorization: `Basic ${base64Credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      baseURL: PAYPAL_MODE === 'sandbox' ? 'https://api-m.sandbox.paypal.com/v1' : 'https://api-m.paypal.com/v1',
    });
  }

  async getAccessToken(code: string) {
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    try {
      const { data } = await this._client.post('/identity/openidconnect/tokenservice', params);
      // add error handling
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  async getClientAccessToken() {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    try {
      const { data } = await this._client.post('/oauth2/token', params);
      // add error handling
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  async getCustomerDataFromToken(accessToken: string): Promise<IPaypalUserIntegration> {
    const { data } = await this._client.get('/oauth2/token/userinfo?schema=openid', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // add error handling
    const paypalUserIntegration: IPaypalUserIntegration = {
      ...data,
      payerId: data.payer_id,
    };
    return paypalUserIntegration;
  }

  async sendPayout(senderBatchHeader: ISendPayoutBatchHeader, items: ISendPayoutBatchItem[]) {
    try {
      const { access_token } = await this.getClientAccessToken();
      const res = await this._client.post(
        '/payments/payouts',
        {
          ...senderBatchHeader,
          items,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${access_token}`,
          },
        },
      );
      return res;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  async getBalances() {
    try {
      const { access_token } = await this.getClientAccessToken();
      const { data } = await this._client.get('/reporting/balances', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access_token}`,
        },
      });
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  async getPrimaryBalance() {
    const { balances } = await this.getBalances();
    return balances.find((balance: IPaypalBalance) => balance.primary);
  }
}
