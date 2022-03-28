import axios, { AxiosInstance } from 'axios';
import { ErrorTypes } from '../lib/constants';
import CustomError, { asCustomError } from '../lib/customError';
import { IRareTransaction } from '../integrations/rare/transaction';
import { SdkClient } from './sdkClient';

interface IRareTransactionsResponse {
  transactions: IRareTransaction[];
}

export class RareClient extends SdkClient {
  _client: AxiosInstance = null;

  constructor() {
    super('Rare');
  }

  _init = () => {
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
    try {
      if (!projectId) throw new CustomError('A project id is required.', ErrorTypes.INVALID_ARG);
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
      if (!rareUserId) throw new CustomError('A user id is required.', ErrorTypes.INVALID_ARG);
      const result = await this._client.get<IRareTransactionsResponse>(`transactions/users/${rareUserId}/transactions`);
      return result.data;
    } catch (err) {
      throw asCustomError(err);
    }
  };
}
