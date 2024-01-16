import * as VGS from '@vgs/api-client';
import { SdkClient } from './sdkClient';
import CustomError, { asCustomError } from '../lib/customError';
import { ErrorTypes } from '../lib/constants';

const { VGS_API_USERNAME, VGS_API_PASSWORD, VGS_API_INBOUND_URL } = process.env;

interface ITokenizeCardData {
  value: string,
}

export class VgsClient extends SdkClient {
  _client: VGS.Aliases;

  constructor() {
    super('VGS');
  }

  protected _init() {
    if (!VGS_API_USERNAME || !VGS_API_PASSWORD || !VGS_API_INBOUND_URL) throw new CustomError('VGS credentials not found', ErrorTypes.INVALID_ARG);

    const config = VGS.config(
      VGS_API_USERNAME,
      VGS_API_PASSWORD,
      'https://api.sandbox.verygoodvault.com',
    );

    this._client = new VGS.Aliases(config);
  }

  async tokenize(data: ITokenizeCardData) {
    if (!data) throw new CustomError('No data to tokenize', ErrorTypes.INVALID_ARG);
    try {
      const _data = [{ ...data, classifiers: 'credit-card', format: 'NUM_LENGTH_PRESERVING', storage: 'PERSISTENT' }];

      /*
      this returns a list of aliases with some nested objects, but we really only care about the alias itself
      example:
      [
        {
          "aliases": [
            {
              "alias": "9914102308033361111",
              "format": "PFPT"
            }
          ],
          "classifiers": [
            "number",
            "credit-card"
          ],
          "createdAt": "2022-04-26T12:25:55.000Z",
          "storage": "PERSISTENT",
          "value": "4111111111111111"
        }
      ]
    */
      const res = await this._client.redact(_data);
      return res[0].aliases[0].alias;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }
}
