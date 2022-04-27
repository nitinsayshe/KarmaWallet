import { SandboxedJob } from 'bullmq';
import { JobNames } from '../../../lib/constants/jobScheduler';
import { mockRequest } from '../../../lib/constants/request';
import * as PlaidIntegration from '../../../integrations/plaid';
import { _MongoClient } from '../../mongo';
import * as CachedDataCleanup from '../../../jobs/cachedDataCleanup';
import * as CacheGroupOffsetData from '../../../jobs/cacheGroupOffsetData';
import * as GenerateGroupStatements from '../../../jobs/generateGroupStatements';
import * as GenerateUserTransactionTotals from '../../../jobs/generateUserTransactionTotals';
import * as SendEmail from '../../../jobs/sendEmail';
import * as TotalOffsetsForAllUsers from '../../../jobs/calculateTotalOffsetsForAllUsers';
import * as TransactionsMonitor from '../../../jobs/monitorTransactions';
import * as UserPlaidTransactionMapper from '../../../jobs/userPlaidTransactionMap';

const MongoClient = new _MongoClient();

// Sandboxed processors must be exported as default to run correctly
// See line 25: node_modules/bullmq/dist/cjs/classes/child-processor.js
export default async (job: SandboxedJob) => {
  // global plaid transaction mapping
  // ind. user linked card plaid transaction mapping
  // sending email (multiple kinds and types)
  // user impact score calculation (run this after global plaid transactions)
  // run reports calc (users report)
  const { name, data } = job;
  let result: any;
  await MongoClient.init();

  switch (name) {
    case JobNames.GlobalPlaidTransactionMapper:
      await PlaidIntegration.mapTransactionsFromPlaid(mockRequest);

      result = {
        nextJobs: [
          { name: JobNames.GenerateUserTransactionTotals },
        ],
      };

      break;
    case JobNames.SendEmail:
      result = await SendEmail.exec(data);
      break;
    case JobNames.CacheGroupOffsetData:
      result = CacheGroupOffsetData.exec();
      break;
    case JobNames.CachedDataCleanup:
      result = CachedDataCleanup.exec();
      break;
    case JobNames.TotalOffsetsForAllUsers:
      result = TotalOffsetsForAllUsers.exec();
      break;
    case JobNames.TransactionsMonitor:
      result = TransactionsMonitor.exec();
      break;
    case JobNames.UserPlaidTransactionMapper:
      result = await UserPlaidTransactionMapper.exec(data);
      break;
    case JobNames.GenerateGroupOffsetStatements:
      result = await GenerateGroupStatements.exec();
      break;
    case JobNames.GenerateUserTransactionTotals:
      result = await GenerateUserTransactionTotals.exec();
      break;
    default:
      console.log('>>>>> invalid job name found: ', name);
      break;
  }
  return result;
};
