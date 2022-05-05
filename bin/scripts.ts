import 'dotenv/config';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { MongoClient } from '../src/clients/mongo';
import { asCustomError } from '../src/lib/customError';
import { Logger } from '../src/services/logger';
import { generateCompanyDataSourceMappingReport } from '../src/services/scripts/generate_company_data_source_mapping_report';
import { createDataSources } from '../src/services/scripts/create_data_sources';
import { mapDataSourcesToUNSDGs } from '../src/services/scripts/map_data_sources_to_unsdgs';
import { mapCompanies2DataSources } from '../src/services/scripts/map_companies_2_data_sources';
import { calculateAllCompanyScores } from '../src/services/scripts/calculate_company_scores';

dayjs.extend(utc);

(async () => {
  try {
    // const mockRequest = ({
    //   requestor: {},
    //   authKey: '',
    // } as IRequest);
    await MongoClient.init();

    // add mappers here...
    await createDataSources();
    await mapDataSourcesToUNSDGs();
    await mapCompanies2DataSources();
    await calculateAllCompanyScores();
    await generateCompanyDataSourceMappingReport();

    await MongoClient.disconnect();
  } catch (err) {
    console.log('\n[-] something went wrong during the migration!');
    Logger.error(asCustomError(err));
    await MongoClient.disconnect();
  }
})();
