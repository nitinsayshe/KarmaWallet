import 'dotenv/config';
import { MongoClient } from '../src/clients/mongo';
import { asCustomError } from '../src/lib/customError';
import { Logger } from '../src/services/logger';
import { calculateAllCompanyScores } from '../src/services/scripts/calculate_company_scores';

(async () => {
  try {
    // const mockRequest = ({
    //   requestor: {},
    //   authKey: '',
    // } as IRequest);
    await MongoClient.init();

    // add mappers here...
    // await createDataSources();
    // await mapDataSourcesToUNSDGs();
    // await mapCompanies2DataSources();
    await calculateAllCompanyScores();
    // await generateCompanyDataSourceMappingReport();

    // add mappers here...
    await MongoClient.disconnect();
  } catch (err) {
    console.log('\n[-] something went wrong during the migration!');
    Logger.error(asCustomError(err));
    await MongoClient.disconnect();
  }
})();
