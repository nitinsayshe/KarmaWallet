import axios, { AxiosInstance } from 'axios';
import { asCustomError } from '../lib/customError';
import { SdkClient } from './sdkClient';

const {
  PAYPAL_CLIENT_ID,
  PAYPAL_CLIENT_SECRET,
  PAYPAL_MODE,
} = process.env;

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
    params.append('grant_type', 'client_credentials');
    params.append('code', code);
    try {
      const { data } = await this._client.post('/oauth2/token', params);
      // add error handling
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  async getCustomerDataFromToken(accessToken: string) {
    const { data } = await this._client.get('/oauth2/token/userinfo?schema=openid', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });
    // add error handling
    return data;
  }
}
