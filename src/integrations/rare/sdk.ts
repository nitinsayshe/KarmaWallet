import axios, { AxiosInstance } from 'axios';
import { asCustomError } from '../../lib/customError';
import { IRareTransaction } from './transaction';

interface IRareTransactionsResponse {
  transactions: IRareTransaction[];
}

export class RareClient {
  _client: AxiosInstance = null;

  constructor() {
    this._init();
  }

  _init = () => {
    console.log('>>>>> rare_api_key', process.env.RARE_API_KEY);
    this._client = axios.create({
      headers: {
        'x-api-key': process.env.RARE_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      baseURL: `https://${process.env.RARE_ENV}.catch-carbon-api.rare.org`,
    });
  };

  getProject = async (projectId: string) => {
    if (!projectId) throw new Error('A project id is required.');

    try {
      const result = await this._client.get(`/projects/${projectId}`);
      return result.data;
    } catch (err) {
      throw asCustomError(err);
    }
  };

  getProjects = async () => {
    try {
      const result = await this._client.get('/projects');
      return result.data;
    } catch (err) {
      throw asCustomError(err);
    }
  };

  getTransactions = async (rareUserId: string): Promise<IRareTransactionsResponse> => {
    try {
      const result = await this._client.get<IRareTransactionsResponse>(`transactions/users/${rareUserId}/transactions`);
      return result.data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  };
}
