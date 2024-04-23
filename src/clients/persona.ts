import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import crypto from 'crypto';
import { SdkClient } from './sdkClient';
import { asCustomError } from '../lib/customError';
import { sleep } from '../lib/misc';
import { getRandomInt } from '../lib/number';
import { IPersonaAccountsRequest, IPersonaCreateAccountBody, PersonaWebhookBody } from '../integrations/persona/types';
import { IRequest } from '../types/request';

const { PERSONA_API_KEY, PERSONA_WEBHOOK_KEY } = process.env;

export class PersonaClient extends SdkClient {
  _client: AxiosInstance;

  constructor() {
    super('Persona');
  }

  protected _init() {
    if (!PERSONA_API_KEY || !PERSONA_WEBHOOK_KEY) throw new Error('Persona credentials not found');

    this._client = axios.create({
      headers: {
        Authorization: `Bearer ${PERSONA_API_KEY}`,
      },
      baseURL: 'https://withpersona.com/api/v1',
    });
  }

  private async sendHttpRequestWithRetry(
    sendRequestFunction: () => Promise<AxiosResponse<any>>,
    initialRetries = 3,
    retries = 3,
  ): Promise<AxiosResponse<any>> {
    try {
      return await sendRequestFunction();
    } catch (err) {
      // Would we want to retry in cases other than 429?
      if (axios.isAxiosError(err) && (err as AxiosError).response?.status === 429) {
        if (retries <= 0) throw err;
        console.error(`Error sending Persona request: ${(err as AxiosError).toJSON()}`);
        console.error(`Retrying request. Retries left: ${retries}`);
        // this logic is taken from comply advantage docs
        // https://docs.complyadvantage.com/api-docs/?javascript#429-too-many-requests-errors
        const MaximumBackoffMs = 60000; // 1 minute
        const randomNumMiliseconds = getRandomInt(1, 1000);
        const n = initialRetries + 1 - retries;
        const backoffTime = Math.min(2 ** n + randomNumMiliseconds, MaximumBackoffMs);
        await sleep(backoffTime);
        return this.sendHttpRequestWithRetry(sendRequestFunction, initialRetries, retries - 1);
      }
      throw err;
    }
  }

  public async verifyWebhookSignature(req: IRequest<{}, {}, PersonaWebhookBody>) {
    const t = req.headers['persona-signature'].split(',')[0].split('=')[1];
    const signatures: string[] = [];
    req.headers['persona-signature'].split(' ')
      .forEach((pair: string) => {
        const [_, value] = pair.split('v1=');
        signatures.push(value);
      });

    const hmac = crypto.createHmac('sha256', PERSONA_WEBHOOK_KEY)
      .update(`${t}.${JSON.stringify(req.body)}`)
      .digest('hex');

    if (crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signatures[0]))
      || crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signatures[1]))) {
      // Handle verified webhook event
      return;
    }
    throw new Error('Invalid signature');
  }

  public async listAllAccounts(queryParams: IPersonaAccountsRequest) {
    try {
      let queryString = '/account';
      if (!!queryParams) {
        queryString = `/accounts?${new URLSearchParams({ ...queryParams }).toString()}`;
      }
      const accounts = await this.sendHttpRequestWithRetry(() => this._client.get(queryString));
      // add error handling
      if (!!accounts.data) return accounts.data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  public async createAccount(accountData: IPersonaCreateAccountBody) {
    try {
      const account = await this._client.post('/accounts', accountData);
      if (!!account.data) return account.data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }
}
