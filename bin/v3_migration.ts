import 'dotenv/config';
import { MongoClient } from '../src/clients/mongo';
import { mapExistingItems as mapExistingPlaidItems, mapTransactionsFromPlaid, mapPlaidCategoriesToKarmaCategoriesAndCarbonMultiplier } from '../src/integrations/plaid';
import { asCustomError } from '../src/lib/customError';
import { Logger } from '../src/services/logger';
import { createSectors, mapCarbonMultipliersToSectors, mapPlaidCategoriesToKarmaSectors } from '../src/services/scripts/new_sectors';
import { mapCompaniesToV3 } from '../src/services/scripts/new_companies';
import { mapUsersToV3 } from '../src/services/scripts/new_user';
import { IRequest } from '../src/types/request';
import { updateAllTransactionsWithUpdatedCarbonMultipliers } from '../src/services/scripts/update_transactions_carbon_multipliers';

(async () => {
  try {
    const mockRequest = ({
      requestor: {},
      authKey: '',
    } as IRequest);
    await MongoClient.init();

    await mapUsersToV3();

    await mapCompaniesToV3(mockRequest);

    await createSectors();
    await mapCarbonMultipliersToSectors();
    await mapPlaidCategoriesToKarmaSectors();
    // TODO: mapSectorsToCompanies

    await mapPlaidCategoriesToKarmaCategoriesAndCarbonMultiplier(mockRequest);
    await mapExistingPlaidItems(mockRequest);
    await mapTransactionsFromPlaid(mockRequest);
    await updateAllTransactionsWithUpdatedCarbonMultipliers(); // TODO: remove this once sectors are added

    await MongoClient.disconnect();
  } catch (err) {
    console.log('\n[-] something went wrong during the migration!');
    Logger.error(asCustomError(err));
  }
})();
