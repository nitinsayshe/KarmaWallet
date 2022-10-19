/* eslint-disable unused-imports/no-unused-imports */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable camelcase */
/* eslint-disable no-unused-vars */
import 'dotenv/config';
import { MongoClient } from '../src/clients/mongo';
import { asCustomError } from '../src/lib/customError';
import { Logger } from '../src/services/logger';
import { calculateAvgScores } from '../src/services/scripts/calculate_avg_sector_scores';
import { checkCompanySectorsForMainTierSector } from '../src/services/scripts/check_company_sectors_for_main_tier_sector';
import { singleBatchMatch } from '../src/services/scripts/match-existing-transactions';
import * as GenerateUserImpactTotals from '../src/jobs/generateUserImpactTotals';
import { getCompaniesWithCompleteData } from '../src/services/scripts/evaluate_companies_data';
import { sanitizeUrls, updateUrls } from '../src/services/scripts/update_companies_urls';
import { updateCompanies } from '../src/services/scripts/batch_company_updates';
import { generateMicrosoftWildfireCompanies } from '../src/services/scripts/generate_microsoft_wildfire_companies';

(async () => {
  try {
    // const mockRequest = ({
    //   requestor: { },
    //   authKey: '',
    // } as IRequest);
    await MongoClient.init();
    // updateCompaniesUrls();
    // add mappers here...
    // await singleBatchMatch(1, BATCH_SIZE);
    // await updateCompanies();
    await generateMicrosoftWildfireCompanies();
    await MongoClient.disconnect();
  } catch (err) {
    Logger.error(asCustomError(err));
    await MongoClient.disconnect();
  }
})();
