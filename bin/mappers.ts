import 'dotenv/config';
import { MongoClient } from '../src/clients/mongo';
import { asCustomError } from '../src/lib/customError';
import { Logger } from '../src/services/logger';
import { mapHiddenCompaniesToNew } from '../src/services/mappers/map-hidden-companies-to-new';
import { mapParentCompanies } from '../src/services/mappers/map-parent-companies';
import { mapSectorsToCompanies } from '../src/services/mappers/sectors-to-companies-mapping';

(async () => {
  try {
    // const mockRequest = ({
    //   requestor: {},
    //   authKey: '',
    // } as IRequest);
    await MongoClient.init();

    // add mappers here...
    await mapHiddenCompaniesToNew();
    await mapSectorsToCompanies();
    await mapParentCompanies();

    await MongoClient.disconnect();
  } catch (err) {
    console.log('\n[-] something went wrong during the migration!');
    Logger.error(asCustomError(err));
  }
})();
