import axios, { AxiosError, AxiosInstance } from 'axios';
import { SdkClient } from './sdkClient';
import { asCustomError } from '../lib/customError';

const { ACTIVECAMPAIGN_API_KEY, ACTIVECAMPAIGN_API_URL } = process.env;

export interface ICreateContactData {
  email: string
  firstName: string
  lastName: string
  fieldValues?: Array<{ field: string; value: string }>
  phone?: string
}

export interface IUpdateContactData {
  id: number
  contact: Partial<ICreateContactData>
}

export interface IGetContactsData {
  ids?: string // could be repeated for multiple ids (e.g. ids[]=1&ids[]=2&ids[]=3)
  email?: string
  email_like?: string // filters for emails containing this value
  exclude?: number // exclude the id provided here
  id_greater?: number // only include ids greater than this value
  id_less?: number // only include ids less than this value
  listid?: string // only include contacts in this list
  search?: string // search for contacts with this value in their name, organization email, or phone number
  seriesid?: number // filters contacts associates with the given automation
  status?: number // filters contacts by status (1 = subscribed, 2 = unsubscribed, 3 = bounced, 4 = inactive)
  tagid?: number // filters contacts by tag
}

export interface ICallbackData {
  url: string
  requestType: string
  detailed_results?: boolean // get success/failure messages for each contact
  params?: Array<{ key: string; value: string }>
  headers?: Array<{ key: string; value: string }>
}

export interface IContactAutomation{
  contact?: string, // contact id
  seriesid?: string,
  startid?: string,
  status?: string,
  bathid?: string, // TODO: restrict to an enum
  automation?: string, // automation id
}

export interface IContactList {
  contact?: string, // contact id
  list?: string, // list ids
  status?: string, // TODO: restrict to an enum
}

// Using this mainly to retrieve list status
export interface IGetContactResponse {
  contactAutomations?: Array<IContactAutomation>
  contactLists?: Array<IContactList>
}

export interface IContactsData {
  email: string
  first_name?: string
  last_name?: string
  fields?: Array<{ id: number; value: string }>
  phone?: string
  tags?: Array<string>
  subscribe?: Array<{ listid: string}>
  unsubscribe?: Array<{ listid: string}>
}

export interface IContactsImportData {
  contacts: Array<IContactsData>
  callback?: ICallbackData // lets you know when the import is complete
}

export interface IContact {
  id: string,
  email: string,
  cdate?: Date,
  phone?: string,
  firstName?: string,
  lastName?: string,
  deleted?: string,
}

export interface Metadata {
  total: string,
}

export interface IGetContactsResponse {
  contacts: Array<IContact>,
  meta: Metadata,
}

const customFieldsLimit = 100;

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

  /* creates contacts - POST /contacts */
  public async createContact(contact: ICreateContactData) {
    try {
      const { data } = await this._client.post('/contacts', { contact });
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  /* updates contacts - PUT /contacts */
  public async updateContact(contact: IUpdateContactData) {
    try {
      const { id } = contact;
      delete contact.id;
      const { data } = await this._client.put(`/contacts/${id}`, { ...contact });
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  /* deletes contacts - DELETE /contacts */
  public async deleteContact(id: number) {
    try {
      const { data } = await this._client.delete(`/contacts/${id}`);
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  /* bulk contact import - POST /bulk_import */
  /* Note: The API specifies a max of 250 contacts at a time */
  public async importContacts(contactImportData: IContactsImportData) {
    try {
      const { data } = await this._client.post(
        '/import/bulk_import',
        contactImportData,
      );
      return data;
    } catch (err) {
      console.log(err);
      if (axios.isAxiosError(err)) {
        console.log(`Bulk contact import request failed: ${JSON.stringify((err as AxiosError)?.response?.data?.failureReasons)}`);
      }
      throw asCustomError(err);
    }
  }

  /* list recent bulk imports - POST /bulk_import */
  public async listBulkImports() {
    try {
      const { data } = await this._client.get('/import/bulk_import');
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  /* list all custom fields - GET /fields */
  public async listCustomFields() {
    try {
      const { data } = await this._client.get('/fields', { params: { limit: customFieldsLimit } });
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  /* bulk contact import status info - GET /import/info */
  public async getImportStatus(batchId: string) {
    try {
      const { data } = await this._client.get('/import/info', { params: { batchId } });
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  /* get contact lsits - GET /contacts/{id} */
  public async getContact(id: number): Promise<IGetContactResponse> {
    try {
      const { data } = await this._client.get(`/contacts/${id}`);
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  /* list, search, and filter contacts - GET /contacts */
  public async getContacts(contactsFilter: IGetContactsData): Promise<IGetContactsResponse> {
    try {
      const { data } = await this._client.get('/contacts', {
        params: contactsFilter,
      });
      return data;
    } catch (err) {
      console.log(err);
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
      console.log(err);
      throw asCustomError(err);
    }
  }
}
