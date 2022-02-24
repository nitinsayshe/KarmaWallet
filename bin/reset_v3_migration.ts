import 'dotenv/config';
import { MongoClient } from '../src/clients/mongo';
import { reset as resetPlaidMapping } from '../src/integrations/plaid';
import { asCustomError } from '../src/lib/customError';
import { LegacyUserModel } from '../src/models/legacyUser';
import { Logger } from '../src/services/logger';
import { resetCompanyMapping } from '../src/services/mappers/new_companies';
import { resetSectors } from '../src/services/mappers/new_sectors';
import { IRequest } from '../src/types/request';

(async () => {
  try {
    const mockRequest = ({
      requestor: {},
      authKey: '',
    } as IRequest);
    await MongoClient.init();

    console.log('\nresetting legacy users...');
    await LegacyUserModel.deleteMany({});
    console.log('[+] legacy users reset successfully');

    await resetCompanyMapping(mockRequest);

    await resetSectors();

    console.log('resetting plaid mapping...');
    await resetPlaidMapping(mockRequest);
    console.log('[+] plaid mapping reset successfully');

    await MongoClient.disconnect();
  } catch (err) {
    console.log('\n[-] something went wrong during the migration reset!');
    Logger.error(asCustomError(err));
  }
})();
