/* eslint-disable camelcase */
import 'dotenv/config';
import { MongoClient } from '../src/clients/mongo';
import { asCustomError } from '../src/lib/customError';
import { Logger } from '../src/services/logger';
import { calculateAllCompanyScores } from '../src/services/scripts/calculate_company_scores';
import { cleanTransactions } from '../src/services/scripts/clean_transactions';
import { createDataSources } from '../src/services/scripts/create_data_sources';
import { mapCompanies2DataSources } from '../src/services/scripts/map_companies_2_data_sources';
import { mapDataSourcesToUNSDGs } from '../src/services/scripts/map_data_sources_to_unsdgs';
import { mapSectorsToTransactions } from '../src/services/scripts/map_sectors_to_transactions';
import { mapUNSDGs } from '../src/services/scripts/new_unsdgs';
import { updateCompanySectorsWithPrimaryStatus } from '../src/services/scripts/update-sectors-with-primary';

(async () => {
  try {
    // const mockRequest = ({
    //   requestor: {},
    //   authKey: '',
    // } as IRequest);
    await MongoClient.init();

    // add mappers here...

    // await mapLegacyUserPwToNewUserPw();
    await mapUNSDGs();
    await updateCompanySectorsWithPrimaryStatus();
    await cleanTransactions();
    await mapSectorsToTransactions();
    await createDataSources();
    await mapDataSourcesToUNSDGs();
    await mapCompanies2DataSources();
    await calculateAllCompanyScores();

    await MongoClient.disconnect();
  } catch (err) {
    console.log('\n[-] something went wrong during the migration!');
    Logger.error(asCustomError(err));
    await MongoClient.disconnect();
  }
})();
