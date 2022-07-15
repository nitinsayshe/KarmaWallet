import { SandboxedJob } from 'bullmq';
import { JobNames } from '../../../lib/constants/jobScheduler';
import { mockRequest } from '../../../lib/constants/request';
import * as PlaidIntegration from '../../../integrations/plaid';
import { _MongoClient } from '../../mongo';
import * as AssociateNegativeToPositiveTransactions from '../../../jobs/associateNegativeToPositiveTransactions';
import * as CachedDataCleanup from '../../../jobs/cachedDataCleanup';
import * as CacheGroupOffsetData from '../../../jobs/cacheGroupOffsetData';
import * as GenerateGroupStatements from '../../../jobs/generateGroupStatements';
import * as GenerateUserImpactTotals from '../../../jobs/generateUserImpactTotals';
import * as GenerateUserTransactionTotals from '../../../jobs/generateUserTransactionTotals';
import * as TotalOffsetsForAllUsers from '../../../jobs/calculateTotalOffsetsForAllUsers';
import * as TransactionsMonitor from '../../../jobs/monitorTransactions';
import * as UserMonthlyImpactReport from '../../../jobs/userMonthlyImpactReports';
import * as UserPlaidTransactionMapper from '../../../jobs/userPlaidTransactionMap';
import * as UpdateRareProjectAverage from '../../../jobs/updateRareProjectAverage';
import * as SendEmail from '../../../jobs/sendEmail';
import * as UploadCsvToGoogleDrive from '../../../jobs/uploadCsvToGoogleDrive';
import { INextJob } from '../base';

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
    case JobNames.AssociationNegativeToPositiveTransactions:
      await AssociateNegativeToPositiveTransactions.exec();

      result = {
        nextJobs: [],
      } as { nextJobs: INextJob[] };

      if (data?.reset?.userTransactionTotals) result.nextJobs.push({ name: JobNames.GenerateUserTransactionTotals });
      if (data?.reset?.userImpactTotals) result.nextJobs.push({ name: JobNames.GenerateUserImpactTotals });
      if (data?.reset?.userMonthlyImpactReports) result.nextJobs.push({ name: JobNames.UserMonthlyImpactReport, data: { generateFullHistory: true } });

      break;
    case JobNames.CachedDataCleanup:
      result = CachedDataCleanup.exec();
      break;
    case JobNames.CacheGroupOffsetData:
      result = CacheGroupOffsetData.exec();
      break;
    case JobNames.GenerateGroupOffsetStatements:
      result = await GenerateGroupStatements.exec();
      break;
    case JobNames.GenerateUserImpactTotals:
      result = await GenerateUserImpactTotals.exec();
      break;
    case JobNames.GenerateUserTransactionTotals:
      result = await GenerateUserTransactionTotals.exec();
      break;
    case JobNames.GlobalPlaidTransactionMapper:
      await PlaidIntegration.mapTransactionsFromPlaid(mockRequest, [], 90);

      result = {
        nextJobs: [
          { name: JobNames.AssociationNegativeToPositiveTransactions, data: { reset: { userTransactionTotals: true, userImpactTotals: true } } },
        ],
      };

      break;
    case JobNames.TotalOffsetsForAllUsers:
      result = await TotalOffsetsForAllUsers.exec();
      break;
    case JobNames.TransactionsMonitor:
      result = await TransactionsMonitor.exec();
      break;
    case JobNames.UserMonthlyImpactReport:
      result = await UserMonthlyImpactReport.exec(data);
      break;
    case JobNames.UserPlaidTransactionMapper:
      result = await UserPlaidTransactionMapper.exec(data);
      break;
    case JobNames.UpdateRareProjectAverage:
      result = await UpdateRareProjectAverage.exec();
      break;
    case JobNames.SendEmail:
      result = await SendEmail.exec(data);
      break;
    case JobNames.UploadCsvToGoogleDrive:
      result = await UploadCsvToGoogleDrive.exec(data);
      break;
    default:
      console.log('>>>>> invalid job name found: ', name);
      break;
  }
  return result;
};
