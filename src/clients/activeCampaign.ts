import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import { asCustomError } from '../lib/customError';
import { sleep } from '../lib/misc';
import { getRandomInt } from '../lib/number';
import { SdkClient } from './sdkClient';

const { ACTIVECAMPAIGN_API_KEY, ACTIVECAMPAIGN_API_URL } = process.env;

const customFieldsLimit = 100;

export interface ICreateContactData {
  email: string;
  firstName?: string;
  lastName?: string;
  fieldValues?: Array<{ field: string; value: string }>;
  phone?: string;
}

export interface IUpdateContactData {
  id: number;
  contact: Partial<ICreateContactData>;
}

export const UpdateContactListStatusEnum = {
  subscribe: 1,
  unsubscribe: 2,
} as const;

export interface IActiveCampaignListTagsResponse {
  tags: Array<{ tagType: string; tag: string; id: string }>;
}

export interface IActiveCampaignContactTagsReponse {
  contactTags: Array<{ contact: string; tag: string; id: string }>;
}

export interface IGetContactsData {
  ids?: string; // could be repeated for multiple ids (e.g. ids[]=1&ids[]=2&ids[]=3)
  email?: string;
  email_like?: string; // filters for emails containing this value
  exclude?: number; // exclude the id provided here
  id_greater?: number; // only include ids greater than this value
  id_less?: number; // only include ids less than this value
  listid?: string; // only include contacts in this list
  search?: string; // search for contacts with this value in their name, organization email, or phone number
  seriesid?: number; // filters contacts associates with the given automation
  status?: number; // filters contacts by status (1 = subscribed, 2 = unsubscribed, 3 = bounced, 4 = inactive)
  tagid?: number; // filters contacts by tag
}

export interface ICallbackData {
  url: string;
  requestType: string;
  detailed_results?: boolean; // get success/failure messages for each contact
  params?: Array<{ key: string; value: string }>;
  headers?: Array<{ key: string; value: string }>;
}

export interface IContactAutomation {
  contact?: string; // contact id
  seriesid?: string;
  startid?: string;
  status?: string;
  bathid?: string; // TODO: restrict to an enum
  automation?: string; // automation id
  adddate?: string;
  remdate?: string | null;
  timespan?: string | null;
  lastblock?: string;
  lastlogid?: string;
  lastdate?: string;
  in_als?: string;
  completedElements?: number;
  totalElements?: number;
  completed?: number;
  completeValue?: number;
  links?: {
    automation: string;
    contact: string;
    contactGoals: string;
    automationLogs: string;
  };
  id?: string;
}

// Define types for each entity in the JSON response

export interface IContactList {
  // Contact List
  contact?: string;
  list?: string;
  form?: string | null;
  seriesid?: string;
  sdate?: string | null;
  udate?: string | null;
  status?: string;
  responder?: string;
  sync?: string;
  unsubreason?: string | null;
  campaign?: string | null;
  message?: string | null;
  first_name?: string;
  last_name?: string;
  ip4Sub?: string;
  sourceid?: string;
  autosyncLog?: string | null;
  ip4_last?: string;
  ip4Unsub?: string;
  unsubscribeAutomation?: string | null;
  links?: {
    automation?: string;
    list?: string;
    contact?: string;
    form?: string;
    autosyncLog?: string;
    campaign?: string;
    unsubscribeAutomation?: string;
    message?: string;
  };
  id?: string;
  automation?: string | null;
}

// Deal
interface IDeal {
  owner: string;
  contact: string;
  organization: string | null;
  group: string | null;
  title: string;
  nexttaskid: string;
  currency: string;
  status: string;
  links: {
    activities: string;
    contact: string;
    contactDeals: string;
    group: string;
    nextTask: string;
    notes: string;
    organization: string;
    owner: string;
    scoreValues: string;
    stage: string;
    tasks: string;
  };
  id: string;
  nextTask: string | null;
}

// Field Value
interface IFieldValue {
  contact: string;
  field: string;
  value: string | null;
  cdate: string;
  udate: string;
  links: {
    owner: string;
    field: string;
  };
  id: string;
  owner: string;
}

// Geo Address
interface IGeoAddress {
  ip4: string;
  country2: string;
  country: string;
  state: string;
  city: string;
  zip: string;
  area: string;
  lat: string;
  lon: string;
  tz: string;
  tstamp: string;
  links: never[]; // This seems to be an empty array in the provided JSON
  id: string;
}

// Geo IP
interface IGeoIp {
  contact: string;
  campaignid: string;
  messageid: string;
  geoaddrid: string;
  ip4: string;
  tstamp: string;
  geoAddress: string;
  links: {
    geoAddress: string;
  };
  id: string;
}

// Contact
interface IContact {
  cdate?: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  orgid?: string;
  segmentio_id?: string;
  bounced_hard?: string;
  bounced_soft?: string;
  bounced_date?: string | null;
  ip?: string;
  ua?: string | null;
  hash?: string;
  socialdata_lastcheck?: string | null;
  email_local?: string;
  email_domain?: string;
  sentcnt?: string;
  rating_tstamp?: string | null;
  gravatar?: string;
  deleted?: string;
  adate?: string | null;
  udate?: string | null;
  edate?: string | null;
  contactAutomations?: string[];
  contactLists?: string[];
  fieldValues?: string[];
  geoIps?: string[];
  deals?: string[];
  accountContacts?: string[];
  links?: {
    bounceLogs?: string;
    contactAutomations?: string;
    contactData?: string;
    contactGoals?: string;
    contactLists?: string;
    contactLogs?: string;
    contactTags?: string;
    contactDeals?: string;
    deals?: string;
    fieldValues?: string;
    geoIps?: string;
    notes?: string;
    organization?: string;
    plusAppend?: string;
    trackingLogs?: string;
    scoreValues?: string;
  };
  id: string;
  organization?: string | null;
}

// Complete Response Type
export interface IGetContactResponse {
  contactAutomations: IContactAutomation[];
  contactLists: IContactList[];
  deals: IDeal[];
  fieldValues: IFieldValue[];
  geoAddresses: IGeoAddress[];
  geoIps: IGeoIp[];
  contact: IContact;
}

export interface IContactsData {
  email: string;
  first_name?: string;
  last_name?: string;
  fields?: Array<{ id: number; value: string }>;
  phone?: string;
  tags?: Array<string>;
  subscribe?: Array<{ listid: string }>;
  unsubscribe?: Array<{ listid: string }>;
}

export interface IContactsImportData {
  contacts: Array<IContactsData>;
  callback?: ICallbackData; // lets you know when the import is complete
}

export interface ContactListUpdateRequest {
  contactList: {
    contact: number;
    list: number;
    status: number;
  };
}

export interface Metadata {
  total: string;
}

export interface IGetContactsResponse {
  contacts: Array<IContact>;
  meta: Metadata;
}

export class ActiveCampaignClient extends SdkClient {
  private _client: AxiosInstance;

  constructor() {
    super('ActiveCampaign');
  }

  protected _init() {
    if (!ACTIVECAMPAIGN_API_KEY || !ACTIVECAMPAIGN_API_URL) {
      throw new Error('Active Campaign credentials not found');
    }

    this._client = axios.create({
      headers: {
        'Api-Token': ACTIVECAMPAIGN_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      baseURL: ACTIVECAMPAIGN_API_URL,
    });
  }

  private async sendHttpRequestWithRetry(sendRequestFunction: () => Promise<AxiosResponse<any>>, initialRetries = 3, retries = 3): Promise<AxiosResponse<any>> {
    try {
      return await sendRequestFunction();
    } catch (err) {
      // Would we want to retry in cases other than 429?
      if (axios.isAxiosError(err) && (err as AxiosError).response?.status === 429) {
        if (retries <= 0) throw err;
        console.error(`Error sending Active Campaign request: ${(err as AxiosError).toJSON()}`);
        console.error(`Retrying request. Retries left: ${retries}`);
        // this logic is taken from comply advantage docs
        // https://docs.complyadvantage.com/api-docs/?javascript#429-too-many-requests-errors
        const MaximumBackoffMs = 60000; // 1 minute
        const randomNumMiliseconds = getRandomInt(1, 1000);
        const n = (initialRetries + 1) - retries;
        const backoffTime = Math.min(2 ** n + randomNumMiliseconds, MaximumBackoffMs);
        await sleep(backoffTime);
        return this.sendHttpRequestWithRetry(sendRequestFunction, initialRetries, retries - 1);
      }

      console.log('////// error in sendHttpRequestWithRetry', err);
    }
  }

  public withHttpClient(client: AxiosInstance) {
    if (!client) {
      return;
    }
    this._client = client;
  }

  /* creates contacts - POST /contacts */
  public async createContact(contact: ICreateContactData) {
    try {
      const { data } = await this.sendHttpRequestWithRetry(() => this._client.post('/contacts', { contact }));
      return data;
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.error((err as AxiosError).toJSON());
      } else {
        console.log(err);
      }
      throw asCustomError(err);
    }
  }

  /* updates contacts - PUT /contacts */
  public async updateContact(contact: IUpdateContactData): Promise<{ contact: IContact }> {
    try {
      const { id } = contact;
      delete contact.id;
      const { data } = await this.sendHttpRequestWithRetry(() => this._client.put(`/contacts/${id}`, { ...contact }));

      return data;
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.error((err as AxiosError).toJSON());
      } else {
        console.log(err);
      }
      throw asCustomError(err);
    }
  }

  /* deletes contacts - DELETE /contacts */
  public async deleteContact(id: number) {
    try {
      const { data } = await this.sendHttpRequestWithRetry(() => this._client.delete(`/contacts/${id}`));
      return data;
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.error((err as AxiosError).toJSON());
      } else {
        console.log(err);
      }
      throw asCustomError(err);
    }
  }

  /* bulk contact import - POST /bulk_import */
  /* Note: The API specifies a max of 250 contacts at a time */
  public async importContacts(contactImportData: IContactsImportData) {
    try {
      const { data } = await this.sendHttpRequestWithRetry(() => this._client.post('/import/bulk_import', contactImportData));
      return data;
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.error((err as AxiosError).toJSON());
      } else {
        console.log(err);
      }
      throw asCustomError(err);
    }
  }

  /* list recent bulk imports - POST /bulk_import */
  public async listBulkImports() {
    try {
      const { data } = await this.sendHttpRequestWithRetry(() => this._client.get('/import/bulk_import'));
      return data;
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.error((err as AxiosError).toJSON());
      } else {
        console.log(err);
      }
      throw asCustomError(err);
    }
  }

  /* list all custom fields - GET /fields */
  public async listCustomFields() {
    try {
      const { data } = await this.sendHttpRequestWithRetry(() => this._client.get('/fields', { params: { limit: customFieldsLimit } }));
      return data;
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.error((err as AxiosError).toJSON());
      } else {
        console.log(err);
      }
      throw asCustomError(err);
    }
  }

  /* bulk contact import status info - GET /import/info */
  public async getImportStatus(batchId: string) {
    try {
      const { data } = await this.sendHttpRequestWithRetry(() => this._client.get('/import/info', { params: { batchId } }));
      return data;
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.error((err as AxiosError).toJSON());
      } else {
        console.log(err);
      }
      throw asCustomError(err);
    }
  }

  /* get contact lsits - GET /contacts/{id} */
  public async getContact(id: number): Promise<IGetContactResponse> {
    try {
      const { data } = await this.sendHttpRequestWithRetry(() => this._client.get(`/contacts/${id}`));
      return data;
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.error((err as AxiosError).toJSON());
      } else {
        console.log(err);
      }
      throw asCustomError(err);
    }
  }

  /* list, search, and filter contacts - GET /contacts */
  public async getContacts(contactsFilter: IGetContactsData): Promise<IGetContactsResponse> {
    try {
      const { data } = await this.sendHttpRequestWithRetry(() => this._client.get('/contacts', { params: contactsFilter }));
      return data;
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.error((err as AxiosError).toJSON());
      } else {
        console.log(err);
      }
      throw asCustomError(err);
    }
  }

  // retrieves custom field ids from active campaign
  public async getCustomFieldIDs(): Promise<Array<{ name: string; id: number }>> {
    try {
      const res = await this.listCustomFields();
      const fields = res.fields.map((field: any) => ({
        name: field.title,
        id: parseInt(field.id, 10),
      }));
      return fields;
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.error((err as AxiosError).toJSON());
      } else {
        console.log(err);
      }
      throw asCustomError(err);
    }
  }

  public async removeContactAutomation(id: number): Promise<AxiosResponse<undefined, undefined>> {
    try {
      const { data } = await this.sendHttpRequestWithRetry(() => this._client.delete(`/contactAutomations/${id}`));
      return data;
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.error((err as AxiosError).toJSON());
      } else {
        console.log(err);
      }
      throw asCustomError(err);
    }
  }

  public async updateContactListStatus(contactListUpdateRequest: ContactListUpdateRequest): Promise<AxiosResponse<undefined, undefined>> {
    try {
      const { data } = await this.sendHttpRequestWithRetry(() => this._client.post('/contactLists', contactListUpdateRequest));
      return data;
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.error((err as AxiosError).toJSON());
      } else {
        console.log(err);
      }
      throw asCustomError(err);
    }
  }

  public async removeTagFromUser(tagId: string): Promise<AxiosResponse<undefined, undefined>> {
    try {
      const data = await this.sendHttpRequestWithRetry(() => this._client.delete(`/contactTags/${tagId}`));
      return data;
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.error((err as AxiosError).toJSON());
      } else {
        console.log(err);
      }
      throw asCustomError(err);
    }
  }

  public async listAllTags(tagName?: string): Promise<IActiveCampaignListTagsResponse> {
    try {
      const query = tagName ? `?search=${tagName}` : '';
      const { data } = await this.sendHttpRequestWithRetry(() => this._client.get(`/tags${query}`));
      return data;
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.error((err as AxiosError).toJSON());
      } else {
        console.log(err);
      }
      throw asCustomError(err);
    }
  }

  public async getContactsTagIds(contactId: number): Promise<IActiveCampaignContactTagsReponse> {
    try {
      const { data } = await this.sendHttpRequestWithRetry(() => this._client.get(`/contacts/${contactId}/contactTags`));
      return data;
    } catch (err) {
      throw asCustomError(err);
    }
  }
}
