/* eslint-disable unused-imports/no-unused-imports */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable camelcase */
/* eslint-disable no-unused-vars */
import 'dotenv/config';
import { MongoClient } from '../src/clients/mongo';
import { asCustomError } from '../src/lib/customError';
import { Logger } from '../src/services/logger';
import { manuallyUpdateTransactionsFalsePositiveNegatives } from '../src/services/scripts/update_false_positive_negatives_transactions';
import { calculateAvgScores } from '../src/services/scripts/calculate_avg_sector_scores';
import { checkCompanySectorsForMainTierSector } from '../src/services/scripts/check_company_sectors_for_main_tier_sector';
import matchExistingTransactions, { singleBatchMatch } from '../src/services/scripts/match-existing-transactions';
import * as GenerateUserImpactTotals from '../src/jobs/generateUserImpactTotals';
import { updateCompanies, updateDataSources, updateCompanyDataSources, updateDataSourceMapping, updateMatchedCompanyNames } from '../src/services/scripts/batch_company_updates';
import { removeDuplicatePlaidTransactions } from '../src/services/scripts/remove_duplicate_plaid_transactions';
import { CompanyDataSourceModel } from '../src/models/companyDataSource';
import { monthlyBatchUpdateEffects } from '../src/services/scripts/monthly_batch_update_effects';
import { generateMicrosoftWildfireCompanies } from '../src/services/scripts/generate_microsoft_wildfire_companies';
import * as uploadCsvToGoogleDrive from '../src/jobs/uploadCsvToGoogleDrive';
import { CsvReportTypes } from '../src/lib/constants/jobScheduler';

const BATCH_SIZE = 50000;
const STARTING_INDEX = 4;

(async () => {
  try {
    // const mockRequest = ({
    //   requestor: { },
    //   authKey: '',
    // } as IRequest);
    await MongoClient.init();
    // await matchExistingTransactions({
    //   startingIndex: STARTING_INDEX,
    //   endingIndex: null,
    //   batchSize: BATCH_SIZE,
    // });
    await MongoClient.disconnect();
  } catch (err) {
    Logger.error(asCustomError(err));
    await MongoClient.disconnect();
  }
})();
