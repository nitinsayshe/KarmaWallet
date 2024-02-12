import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import { SdkClient } from './sdkClient';
import { asCustomError } from '../lib/customError';
import {
  IComplyAdvantageSearchParams,
  IComplyAdvantageSearchResponseContent,
  ICompyAdvantageUpdateMonitoredSearchContent,
} from '../integrations/complyAdvantage/types';
import { sleep } from '../lib/misc';
import { getRandomInt } from '../lib/number';

const { COMPLYADVANTAGE_KEY } = process.env;

export class ComplyAdvantage extends SdkClient {
  _client: AxiosInstance;

  constructor() {
    super('ComplyAdvantage');
  }

  protected _init() {
    if (!COMPLYADVANTAGE_KEY) throw new Error('ComplyAdvantage credentials not found');

    this._client = axios.create({
      headers: {
        Authorization: `Token ${COMPLYADVANTAGE_KEY}`,
      },
      baseURL: 'https://api.us.complyadvantage.com',
    });
  }

  private async sendHttpRequestWithRetry(sendRequestFunction: () => Promise<AxiosResponse<any>>, initialRetries = 3, retries = 3): Promise<AxiosResponse<any>> {
    try {
      return await sendRequestFunction();
    } catch (err) {
      // Would we want to retry in cases other than 429?
      if (axios.isAxiosError(err) && (err as AxiosError).response?.status === 429) {
        if (retries <= 0) throw err;
        console.error(`Error sending Comply advantage request: ${(err as AxiosError).toJSON()}`);
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
    }
  }

  public async getUsers() {
    try {
      const { data } = await this.sendHttpRequestWithRetry(() => this._client.get('/users'));
      // add error handling
      if (!!data.content) return data.content.data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  public async getSearches() {
    try {
      const { data } = await this.sendHttpRequestWithRetry(() => this._client.get('/searches'));
      if (!!data.content) return data.content.data;
    } catch (err) {
      console.log('[!] Error getting searches', err);
      throw asCustomError(err);
    }
  }

  public async createNewSearch(params: IComplyAdvantageSearchParams): Promise<IComplyAdvantageSearchResponseContent> {
    try {
      const { data } = await this.sendHttpRequestWithRetry(() => this._client.post('/searches', params));
      if (!!data.content) return data.content;
      throw new Error(`Error creating search, no content returned: ${JSON.stringify(data)}`);
    } catch (err) {
      console.log('[!] Error creating new search', err);
      throw asCustomError(err);
    }
  }

  public async lookUpSearchById(id: string) {
    try {
      const { data } = await this.sendHttpRequestWithRetry(() => this._client.get(`/searches/${id}`));
      if (!!data.content) return data.content.data;
    } catch (err) {
      console.log('[!] Error lookup up by search id', err);
      throw asCustomError(err);
    }
  }

  public async getMonitoredSearchById(id: string) {
    try {
      const { data } = await this.sendHttpRequestWithRetry(() => this._client.get(`/searches/${id}/monitors`));
      if (!!data.content) return data.content;
    } catch (err) {
      console.log('[!] Error lookup up by search id', err);
      throw asCustomError(err);
    }
  }

  public async toggleMonitorSearch(id: number, monitor: boolean): Promise<ICompyAdvantageUpdateMonitoredSearchContent> {
    try {
      const params = { is_monitored: monitor };
      const { data } = await this.sendHttpRequestWithRetry(() => this._client.patch(`/searches/${id}/monitors`, params));
      if (!!data.content) return data.content;
    } catch (err) {
      console.log('[!] Error toggling monitor search', err);
      throw asCustomError(err);
    }
  }

  public async deleteSearch(id: string) {
    try {
      const { data } = await this.sendHttpRequestWithRetry(() => this._client.delete(`/searches/${id}`));
      if (!!data.content) return data;
    } catch (err) {
      console.log('[!] Error deleting search', err);
      throw asCustomError(err);
    }
  }

  public async updateSearch(id: string, params: IComplyAdvantageSearchParams) {
    try {
      const { data } = await this.sendHttpRequestWithRetry(() => this._client.patch(`/searches/${id}`, params));
      if (!!data.content) return data.content;
    } catch (err) {
      console.log('[!] Error updating search', err);
      throw asCustomError(err);
    }
  }
}
