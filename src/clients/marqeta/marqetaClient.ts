import axios, { AxiosInstance } from 'axios';
import { SdkClient } from '../sdkClient';

const {
  MARQETA_APPLICATION_TOKEN,
  MARQETA_ACCESS_TOKEN,
  MARQETA_ACCESS_TOKEN_PRIVATE,
  MARQETA_BASE_URL,
} = process.env;

export class MarqetaClient extends SdkClient {
  _client: AxiosInstance;
  _accessToken: string;

  constructor(privateAccessToken?: boolean) {
    super('Marqeta');
    this._accessToken = privateAccessToken ? MARQETA_ACCESS_TOKEN_PRIVATE : '';
    this._init();
  }

  protected _init() {
    this._accessToken = this._accessToken ? MARQETA_ACCESS_TOKEN_PRIVATE : MARQETA_ACCESS_TOKEN;
    if (!this._accessToken || !MARQETA_APPLICATION_TOKEN || !MARQETA_BASE_URL) throw new Error('Marqeta credentials not found');
    const base64Credentials = Buffer.from(`${MARQETA_APPLICATION_TOKEN}:${this._accessToken}`).toString('base64');
    this._client = axios.create({
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Basic ${base64Credentials}`,
      },
      baseURL: MARQETA_BASE_URL,
    });
  }
}
