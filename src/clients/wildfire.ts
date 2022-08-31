import axios, { AxiosInstance } from 'axios';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
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

  constructor() {
    super('Wildfire');
  }

  protected _init() {
    this._client = axios.create({
      headers: {
        'x-api-key': WILDFIRE_CLIENT_APP_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      baseURL: `https://${process.env.RARE_ENV}.catch-carbon-api.rare.org`,
    });
  }
}
