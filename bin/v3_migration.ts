import 'dotenv/config';
import { MongoClient } from '../src/clients/mongo';
import { asCustomError } from '../src/lib/customError';
import { Logger } from '../src/services/logger';
import { mapCompaniesToV3 } from '../src/services/mappers/new_companies';
import { mapUsersToV3 } from '../src/services/mappers/new_user';
import { IRequest } from '../src/types/request';

(async () => {
  try {
    const mockRequest = ({
      requestor: {},
      authKey: '',
    } as IRequest);
    await MongoClient.init();

    await mapUsersToV3();

    await mapCompaniesToV3(mockRequest);

    // await mapPlaidCategoriesToKarmaCategoriesAndCarbonMultiplier(mockRequest);
    // await mapExistingPlaidItems(mockRequest);
    // await mapTransactionsFromPlaid(mockRequest);

    await MongoClient.disconnect();
  } catch (err) {
    console.log('\n[-] something went wrong during the migration!');
    Logger.error(asCustomError(err));
  }
})();
