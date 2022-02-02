import 'dotenv/config';
import { MongoClient } from '../src/clients/mongo';
import { asCustomError } from '../src/lib/customError';
import { Logger } from '../src/services/logger';
import { mapUsersToV3 } from '../src/services/mappers/new_user';

(async () => {
  try {
    await MongoClient.init();

    await mapUsersToV3();

    await MongoClient.disconnect();
  } catch (err) {
    console.log('\n[-] something went wrong during the migration!');
    Logger.error(asCustomError(err));
  }
})();
