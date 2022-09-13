import axios, { AxiosInstance } from 'axios';
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
        'Content-Type': 'application/json',
      },
      baseURL: 'https://api-m.paypal.com/v1',
    });
  }

  async getAccessToken(code: string) {
    const { data } = await this._client.post('/identity/openidconnect/tokenservice', {
      grant_type: 'authorization_code',
      code,
    });
    // add error handling
    return data;
  }

  async getCustomerDataFromToken(accessToken: string) {
    const { data } = await this._client.get('/oauth2/token/userinfo?schema=openid', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    // add error handling
    return data;
  }
}
