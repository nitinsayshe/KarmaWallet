import 'dotenv/config';
import { MongoClient } from '../src/clients/mongo';
import { asCustomError } from '../src/lib/customError';
import { Logger } from '../src/services/logger';
import { calculateAllCompanyScores } from '../src/services/scripts/calculate_company_scores';
import { createDataSources } from '../src/services/scripts/create_data_sources';
import { generateCompanyDataSourceMappingReport } from '../src/services/scripts/generate_company_data_source_mapping_report';
import { mapCompanies2DataSources } from '../src/services/scripts/map_companies_2_data_sources';
import { mapDataSourcesToUNSDGs } from '../src/services/scripts/map_data_sources_to_unsdgs';

(async () => {
  try {
    // const mockRequest = ({
    //   requestor: {},
    //   authKey: '',
    // } as IRequest);
    await MongoClient.init();

    // await getGroupmMembersWithCards();

    // add mappers here...
    await createDataSources();
    await mapDataSourcesToUNSDGs();
    await mapCompanies2DataSources();
    await calculateAllCompanyScores();
    await generateCompanyDataSourceMappingReport();

    // add mappers here...
    await MongoClient.disconnect();
  } catch (err) {
    console.log('\n[-] something went wrong during the migration!');
    Logger.error(asCustomError(err));
    await MongoClient.disconnect();
  }
})();
