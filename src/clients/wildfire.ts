import axios, { AxiosInstance } from 'axios';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import CustomError, { asCustomError } from '../lib/customError';
import { SdkClient } from './sdkClient';

dayjs.extend(utc);

interface IWildfireClient {
  admin: string,
  client: string
}

const {
  WILDFIRE_ADMIN_APP_KEY,
  WILDFIRE_ADMIN_APP_ID,
  WILDFIRE_CLIENT_APP_KEY,
  WILDFIRE_CLIENT_APP_ID,
} = process.env;

export class WildfireClient extends SdkClient {
  _client: AxiosInstance;
  _adminClient: AxiosInstance;

  constructor() {
    super('Wildfire');
  }

  protected _init() {
    this._client = axios.create({
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      baseURL: `https://www.wildlink.me/data/${WILDFIRE_CLIENT_APP_ID}`,
    });

    this._adminClient = axios.create({
      headers: {
        Authorization: WILDFIRE_CLIENT_APP_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      baseURL: 'https://api.wfi.re/v2',
    });
  }

  adminCreateDevice = async () => {
    try {
      const data = await this._adminClient.post('/device', { data: { DeviceKey: '' } });
      return data;
    } catch (err) {
      console.log(err);
    }
  };

  getMerchantRates = async () => {
    let data;
    try {
      data = await this._client.get('/merchant-rate/1');
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
    if (!data) throw new CustomError('No merchant rate data returned from Wildfire');
    return data;
  };

  getCoupons = async () => {
    let data;
    try {
      data = await this._client.get('/coupon/1');
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
    if (!data) throw new CustomError('No coupon data returned from Wildfire');
    return data;
  };

  getActiveDomains = async () => {
    let data;
    try {
      data = await this._client.get('/active-domain/1');
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
    if (!data) throw new CustomError('No active-domain data returned from Wildfire');
    return data;
  };

  getMerchants = async () => {
    let data;
    try {
      data = await this._client.get('/merchant/1');
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
    if (!data) throw new CustomError('No merchant data returned from Wildfire');
    return data;
  };

  getCategoryData = async () => {
    let data;
    try {
      data = await this._client.get('/category/1');
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
    if (!data) throw new CustomError('No category data returned from Wildfire');
    return data;
  };

  getFeaturedMerchantData = async () => {
    let data;
    try {
      data = await this._client.get('/featured-merchant/1');
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
    if (!data) throw new CustomError('No featured merchant data returned from Wildfire');
    return data;
  };
}
