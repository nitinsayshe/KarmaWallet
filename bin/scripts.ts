/* eslint-disable camelcase */
import 'dotenv/config';
import { MongoClient } from '../src/clients/mongo';
import { PlaidClient } from '../src/clients/plaid';
import { asCustomError } from '../src/lib/customError';
import { Logger } from '../src/services/logger';

(async () => {
  try {
    // const mockRequest = ({
    //   requestor: {},
    //   authKey: '',
    // } as IRequest);
    await MongoClient.init();
    const client = new PlaidClient();
    const public_token = await client.sandboxCreatePublicToken();
    console.log(public_token);
    // add mappers here...
    await MongoClient.disconnect();
  } catch (err) {
    console.log('\n[-] something went wrong during the migration!');
    Logger.error(asCustomError(err));
    await MongoClient.disconnect();
  }
})();
