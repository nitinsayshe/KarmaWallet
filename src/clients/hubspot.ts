import axios, { AxiosInstance } from 'axios';
import { SdkClient } from './sdkClient';
import { asCustomError } from '../lib/customError';
import { HubspotPortalId } from '../lib/constants';
import { HubspotFormId } from '../types/marketing_subscription';

const { HUBSPOT_APP_TOKEN, HUBSPOT_URL } = process.env;

interface IField {
  name: string;
  value: string;
}

export interface ISubmitFormRequest {
  formId: HubspotFormId;
  fields: Array<IField>;
  context: {
    pageUri?: string;
    pageName?: string;
  };
}

export class HubspotClient extends SdkClient {
  private _client: AxiosInstance;

  constructor() {
    super('HubspotClient');
  }

  protected _init() {
    if (!HUBSPOT_URL || !HUBSPOT_APP_TOKEN) {
      throw new Error('Hubspot credentials not found');
    }

    this._client = axios.create({
      headers: {
        Authorization: `Bearer ${HUBSPOT_APP_TOKEN}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      baseURL: HUBSPOT_URL,
    });
  }

  public async submitForm(req: ISubmitFormRequest) {
    try {
      if (!Object.values(HubspotFormId).includes(req.formId)) {
        throw new Error('Invalid form id');
      }
      const { data } = await this._client.post(`/integration/secure/submit/${HubspotPortalId}/${req.formId}`, req);
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }
}
