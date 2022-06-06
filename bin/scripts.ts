/* eslint-disable camelcase */
import 'dotenv/config';
import { MongoClient } from '../src/clients/mongo';
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

    // await mapLegacyUserPwToNewUserPw();
    // await mapUNSDGs();
    // await updateCompanySectorsWithPrimaryStatus();
    // await cleanTransactions();
    // await mapSectorsToTransactions();
    // await createDataSources();
    // await mapDataSourcesToUNSDGs();
    // await mapCompanies2DataSources();
    // await calculateAllCompanyScores();

    await MongoClient.disconnect();
  } catch (err) {
    console.log('\n[-] something went wrong during the migration!');
    Logger.error(asCustomError(err));
    await MongoClient.disconnect();
  }
})();
