/* eslint-disable camelcase */
import 'dotenv/config';
import { MongoClient } from '../src/clients/mongo';
import { asCustomError } from '../src/lib/customError';
import { Logger } from '../src/services/logger';
import { generateTransactionCsv } from '../src/services/scripts/generate-transaction-csv';

(async () => {
  try {
    // const mockRequest = ({
    //   requestor: {},
    //   authKey: '',
    // } as IRequest);
    await MongoClient.init();

    await generateTransactionCsv();

    // add mappers here...
    // await createDataSources();
    // await mapDataSourcesToUNSDGs();
    // await mapCompanies2DataSources();
    // await calculateAllCompanyScores();
    // await generateCompanyDataSourceMappingReport();

    // add mappers here...
    await MongoClient.disconnect();
  } catch (err) {
    console.log('\n[-] something went wrong during the migration!');
    Logger.error(asCustomError(err));
    await MongoClient.disconnect();
  }
})();
