import axios, { AxiosInstance } from 'axios';
import dayjs from 'dayjs';
import CryptoJS from 'crypto-js';
import utc from 'dayjs/plugin/utc';
import CustomError, { asCustomError } from '../lib/customError';
import { SdkClient } from './sdkClient';

dayjs.extend(utc);

export interface IWildfireAdminCommissionParams {
  startDate: string,
  endDate?: string,
  limit?: number,
  cursor?: string
}

const {
  WILDFIRE_ADMIN_APP_KEY,
  WILDFIRE_ADMIN_APP_ID,
  WILDFIRE_CLIENT_APP_KEY,
  WILDFIRE_CLIENT_APP_ID,
  WILDFIRE_DEVICE_KEY,
  WILDFIRE_DEVICE_TOKEN,
  WIDLFIRE_DEVICE_UUID,
} = process.env;

export const getWildfireAuthorization = (
  appId: string,
  appKey: string,
  deviceToken: string = '',
) => {
  if (!appId || !appKey) throw new Error('Missing wildfire app id or app key');
  const wfTime = new Date().toISOString();
  const stringToSign = `${[wfTime, deviceToken, ''].join('\n')}\n`;
  const appSignature = CryptoJS.HmacSHA256(stringToSign, appKey).toString(CryptoJS.enc.Hex);
  const authorization = `WFAV1 ${[appId, appSignature, deviceToken, ''].join(':')}`;
  return { authorization, wfTime };
};

export class WildfireClient extends SdkClient {
  _client: AxiosInstance;
  _adminClient: AxiosInstance;
  _clientClient: AxiosInstance;

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

    const {
      authorization: adminAuthorization,
      wfTime: adminWfTime,
    } = getWildfireAuthorization(WILDFIRE_ADMIN_APP_ID, WILDFIRE_ADMIN_APP_KEY);

    this._adminClient = axios.create({
      headers: {
        Authorization: adminAuthorization,
        'X-WF-DateTime': adminWfTime,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      baseURL: 'https://api.wfi.re',
    });

    const {
      authorization: clientAuthorization,
      wfTime: clientWfTime,
    } = getWildfireAuthorization(WILDFIRE_CLIENT_APP_ID, WILDFIRE_CLIENT_APP_KEY);

    this._clientClient = axios.create({
      headers: {
        Authorization: clientAuthorization,
        'Content-Type': 'application/json',
        'X-WF-DateTime': clientWfTime,
        Accept: 'application/json',
      },
      baseURL: 'https://api.wfi.re',
    });
  }

  adminCreateDevice = async () => {
    try {
      const data = await this._adminClient.post('/v2/device', { data: { DeviceKey: '' } });
      return data;
    } catch (err) {
      console.log(err);
    }
  };

  clientCreateDevice = async () => {
    try {
      const data = await this._clientClient.post('/v2/device', { data: { DeviceKey: '' } });
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

  getComissionSummary = async () => {
    let data;
    try {
      data = await this._clientClient.get('/device/stats/commission-summary');
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
    if (!data) throw new CustomError('No commission summary data returned from Wildfire');
    return data;
  };

  // IMPORTANT: This endpoint has a rate limit of 1 request per 5 seconds.
  getAdminComissionDetails = async ({
    startDate,
    endDate,
    cursor,
    limit = 100,
  }: IWildfireAdminCommissionParams) => {
    let data;
    let params = '';
    if (!startDate) throw Error('Missing start date');
    params += `start_modified_date=${dayjs(startDate).utc().format('YYYY-MM-DD')}&limit=${limit}`;
    if (endDate) params += `&end_modified_date=${dayjs(endDate).utc().format('YYYY-MM-DD')}`;
    if (cursor) params += `&cursor=${cursor}`;
    try {
      data = await this._adminClient.get(`/v3/commission?${params}`);
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
    if (!data) throw new CustomError('No commission detail data returned from Wildfire');
    return data;
  };

  // used for testing the callback
  resendComissionCallback = async (commissionId: string) => {
    let data;
    try {
      data = await this._adminClient.post(`/v2/commission/${commissionId}/send-callback`);
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
    if (!data) throw new CustomError('No commission detail data returned from Wildfire');
    return data;
  };
}
