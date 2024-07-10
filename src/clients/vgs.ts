import 'dotenv/config';
import process from 'process';
import axios, { AxiosInstance } from 'axios';
import { SdkClient } from './sdkClient';
import CustomError from '../lib/customError';
import { ErrorTypes } from '../lib/constants';

const { VGS_API_USERNAME, VGS_API_PASSWORD, VGS_API_OUTBOUND_URL, VGS_API_INBOUND_URL } = process.env;

export class VgsClient extends SdkClient {
  outboundProxy: string;
  inboundProxy: string;
  agentOptions : any;
  _reverseProxyClient : AxiosInstance;

  constructor() {
    super('VGS');
  }

  protected _init() {
    if (!VGS_API_USERNAME || !VGS_API_PASSWORD || !VGS_API_OUTBOUND_URL) throw new CustomError('VGS credentials not found.....', ErrorTypes.INVALID_ARG);
    this.outboundProxy = `https://${VGS_API_USERNAME}:${VGS_API_PASSWORD}@${VGS_API_OUTBOUND_URL}:8443`;
    this.inboundProxy = `https://${VGS_API_INBOUND_URL}`;
    this.agentOptions = {
      proxy: this.outboundProxy,
      proxyRequestOptions: {
        ca: [process.env.VGS_SANDBOX_PEM],
        rejectUnauthorized: false,
      },
    };

    this._reverseProxyClient = axios.create({
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
      },
      baseURL: this.inboundProxy,
    });
  }
}
