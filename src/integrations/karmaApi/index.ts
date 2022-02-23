import axios, { AxiosInstance } from 'axios';
import CustomError from '../../lib/customError';
import { ErrorTypes } from '../../lib/constants';

const { KW_API_URL, KW_API_PUBLIC_TOKEN } = process.env;

class KarmaApiClient {
  _client: AxiosInstance = null;

  constructor() {
    this._init();
  }

  _init = () => {
    this._client = axios.create({
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `${KW_API_PUBLIC_TOKEN}`,
      },
      baseURL: KW_API_URL,
    });
  };

  sendRareWebhook = async (uid: string) => {
    try {
      const result = await this._client.post('/webhook/rare', { uid });
      return result.data;
    } catch (err) {
      console.log(err);
      throw new CustomError('Error sending Rare webhook to KarmaWallet API.', ErrorTypes.GEN);
    }
  };

  sendPlaidTransactionWebhook = async (uid: string) => {
    try {
      const result = await this._client.post('/webhook/plaid', { uid });
      return result.data;
    } catch (err) {
      console.log(err);
      throw new CustomError('Error sending Plaid Transactions webhook to KarmaWallet API.', ErrorTypes.GEN);
    }
  };
}

export default KarmaApiClient;
