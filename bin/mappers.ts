import 'dotenv/config';
import { MongoClient } from '../src/clients/mongo';
import { exec } from '../src/jobs/monitorTransactions';
import { asCustomError } from '../src/lib/customError';
import { Logger } from '../src/services/logger';

(async () => {
  try {
    // const mockRequest = ({
    //   requestor: {},
    //   authKey: '',
    // } as IRequest);
    await MongoClient.init();

    // add mappers here...
    await exec();

    await MongoClient.disconnect();
  } catch (err) {
    console.log('\n[-] something went wrong during the migration!');
    Logger.error(asCustomError(err));
  }
})();
