/* eslint-disable no-restricted-syntax */
/* eslint-disable unused-imports/no-unused-imports */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable camelcase */
/* eslint-disable no-unused-vars */
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import 'dotenv/config';
import { MongoClient } from '../src/clients/mongo';
import { generateMonthlyImpactReportForUser } from '../src/jobs/userMonthlyImpactReports';
import { asCustomError } from '../src/lib/customError';
import { Logger } from '../src/services/logger';
import * as UserMonthlyImpactReports from '../src/jobs/userMonthlyImpactReports';
import { globalPlaidTransactionMapping } from '../src/services/scripts/global_plaid_transaction_mapping';
import { globalTransactionUpdates } from '../src/services/scripts/global_transaction_updates';

(async () => {
  try {
    await MongoClient.init();
    await globalPlaidTransactionMapping({
      startDate: '2023-01-01',
      endDate: '2023-04-21',
      filterExistingTransactions: true,
      accessTokens: ['access-production-6c424a18-af74-4344-bf17-80793fee67ad'],
    });
    // await globalTransactionUpdates({ writeOutput: false });
  } catch (err) {
    console.log(err);
  } finally {
    MongoClient.disconnect();
  }
})();
