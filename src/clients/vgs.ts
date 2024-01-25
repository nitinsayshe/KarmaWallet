import { ErrorTypes } from '../lib/constants';
import CustomError from '../lib/customError';
import { SdkClient } from './sdkClient';

const { VGS_API_USERNAME, VGS_API_PASSWORD, VGS_API_OUTBOUND_URL, VGS_API_INBOUND_URL } = process.env;

export class VgsClient extends SdkClient {
  outboundProxy: string;
  inboundProxy: string;

  constructor() {
    super('VGS');
  }

  protected _init() {
    if (!VGS_API_USERNAME || !VGS_API_PASSWORD || !VGS_API_OUTBOUND_URL) throw new CustomError('VGS credentials not found', ErrorTypes.INVALID_ARG);
    this.outboundProxy = `https://${VGS_API_USERNAME}:${VGS_API_PASSWORD}@${VGS_API_OUTBOUND_URL}:8443`;
    // this.inboundProxy = `https://${VGS_API_USERNAME}:${VGS_API_PASSWORD}@${VGS_API_INBOUND_URL}:8443`;
  }
}
