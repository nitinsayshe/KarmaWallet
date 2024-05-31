import { SandboxedJob } from 'bullmq';
import dayjs from 'dayjs';
import { JobNames } from '../../../lib/constants/jobScheduler';
import { _MongoClient } from '../../mongo';
import * as AssociateNegativeToPositiveTransactions from '../../../jobs/associateNegativeToPositiveTransactions';
import * as CachedDataCleanup from '../../../jobs/cachedDataCleanup';
import * as CacheGroupOffsetData from '../../../jobs/cacheGroupOffsetData';
import * as CalculateAverageSectorScores from '../../../jobs/calculateAverageSectorScores';
import * as CalculateCompanyScores from '../../../jobs/calculateCompanyScores';
import * as CreateBatchCompanies from '../../../jobs/createBatchCompanies';
import * as CreateBatchedDataSources from '../../../jobs/createBatchDataSources';
import * as MarqetaTransactionSync from '../../../jobs/marqetaSync';
import * as GenerateGroupStatements from '../../../jobs/generateGroupStatements';
import * as GenerateUserImpactTotals from '../../../jobs/generateUserImpactTotals';
import * as GenerateUserReport from '../../../jobs/generateUserReport';
import * as GenerateUserTransactionTotals from '../../../jobs/generateUserTransactionTotals';
import * as ResetTestIdentities from '../../../jobs/resetTestIdentities';
import * as TotalOffsetsForAllUsers from '../../../jobs/calculateTotalOffsetsForAllUsers';
import * as UserMonthlyImpactReport from '../../../jobs/userMonthlyImpactReports';
import * as UserPlaidTransactionMapper from '../../../jobs/userPlaidTransactionMap';
import * as UpdateRareProjectAverage from '../../../jobs/updateRareProjectAverage';
import * as SendEmail from '../../../jobs/sendEmail';
import * as UpdateBatchCompanyDataSources from '../../../jobs/updateBatchCompanyDataSources';
import * as UpdateBatchCompanyParentChildrenRelationships from '../../../jobs/updateBatchCompanyParentChildrenRelationships';
import * as UploadCsvToGoogleDrive from '../../../jobs/uploadCsvToGoogleDrive';
import * as UpdateExpiredApplications from '../../../jobs/updateExpiredApplications';
import * as UpdateWildfireMerchantsAndData from '../../../jobs/updateWildfireMerchantsAndData';
import * as UpdateKardMerchantsAndData from '../../../jobs/updateKardMerchantsAndData';
import * as GenerateCommissionPayouts from '../../../jobs/generateCommissionPayouts';
import * as GenerateAdminSummaryReport from '../../../jobs/generateAdminSummaryReport';
import * as UpdateWildfireCommissions from '../../../jobs/updateWildfireCommissions';
import * as KardCommissionReconciliation from '../../../jobs/kardCommissionReconciliation';
import * as SyncActiveCampaign from '../../../jobs/syncActiveCampaign';
import * as GenerateKarmaCardStatements from '../../../jobs/generateKarmaCardStatements';
import * as OrderKarmaWalletCards from '../../../jobs/orderKarmaWalletCards';
import * as WordpressArticleSync from '../../../jobs/wordpresArticleSync';
import { INextJob } from '../base';
import { globalPlaidTransactionMapping } from '../../../services/scripts/global_plaid_transaction_mapping';

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
    case JobNames.CalculateCompanyScores:
      await CalculateCompanyScores.exec(data);

      result = {
        nextJobs: [
          { name: JobNames.CalculateAverageSectorScores },
        ],
      };

      break;
    case JobNames.CalculateAverageSectorScores:
      result = await CalculateAverageSectorScores.exec();
      break;
    case JobNames.CreateBatchCompanies:
      result = await CreateBatchCompanies.exec(data);
      break;
    case JobNames.CreateBatchDataSources:
      await CreateBatchedDataSources.exec(data);

      result = {
        nextJobs: [
          {
            name: JobNames.CalculateCompanyScores,
            data: { jobReportId: data.jobReportId },
          },
        ],
      };

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
      await globalPlaidTransactionMapping({
        startDate: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
        endDate: dayjs().format('YYYY-MM-DD'),
        filterExistingTransactions: true,
      });
      // await PlaidIntegration.mapTransactionsFromPlaid(mockRequest, [], 20);

      result = {
        nextJobs: [
          { name: JobNames.AssociationNegativeToPositiveTransactions, data: { reset: { userTransactionTotals: true, userImpactTotals: true } } },
        ],
      };

      break;
    case JobNames.ResetTestIdentities:
      result = await ResetTestIdentities.exec();
      break;
    case JobNames.TotalOffsetsForAllUsers:
      result = await TotalOffsetsForAllUsers.exec();
      break;
    case JobNames.SendEmail:
      result = await SendEmail.exec(data);
      break;
    case JobNames.UpdateBatchCompanyDataSources:
      result = await UpdateBatchCompanyDataSources.exec(data);
      break;
    case JobNames.UpdateBatchCompanyParentChildrenRelationships:
      // eslint-disable-next-line no-case-declarations
      const jobResult = await UpdateBatchCompanyParentChildrenRelationships.exec(data);

      result = !data.jobReportId
        ? {
          nextJobs: [
            { name: JobNames.CalculateCompanyScores, data: { jobReportId: data.jobReportId } },
          ],
        }
        : jobResult;

      break;
    case JobNames.UpdateRareProjectAverage:
      result = await UpdateRareProjectAverage.exec();
      break;
    case JobNames.UpdateExpiredApplications:
      result = await UpdateExpiredApplications.exec();
      break;
    case JobNames.UploadCsvToGoogleDrive:
      result = await UploadCsvToGoogleDrive.exec(data);
      break;
    case JobNames.UserMonthlyImpactReport:
      result = await UserMonthlyImpactReport.exec(data);
      break;
    case JobNames.UserPlaidTransactionMapper:
      result = await UserPlaidTransactionMapper.exec(data);
      break;
    case JobNames.UpdateWildfireMerchantsAndData:
      result = await UpdateWildfireMerchantsAndData.exec();
      break;
    case JobNames.UpdateKardData:
      result = await UpdateKardMerchantsAndData.exec(data);
      break;
    case JobNames.MarqetaDataSync:
      result = await MarqetaTransactionSync.exec(data);
      break;
    case JobNames.KardCommissionReconciliation:
      result = await KardCommissionReconciliation.exec(data);
      break;
    case JobNames.GenerateKarmaCardStatements:
      result = await GenerateKarmaCardStatements.exec();
      break;
    case JobNames.GenerateCommissionPayouts:
      result = await GenerateCommissionPayouts.exec();
      break;
    case JobNames.GenerateAdminSummaryReport:
      result = await GenerateAdminSummaryReport.exec();
      break;
    case JobNames.GenerateUserReport:
      result = await GenerateUserReport.exec(data);
      break;
    case JobNames.UpdateWildfireCommissions:
      result = await UpdateWildfireCommissions.exec();
      break;
    case JobNames.SyncActiveCampaign:
      result = await SyncActiveCampaign.exec(data);
      break;
    case JobNames.OrderKarmaWalletCards:
      result = await OrderKarmaWalletCards.exec(data);
      break;
    case JobNames.WordpressArticleSync:
      result = await WordpressArticleSync.exec();
      break;
    default:
      console.log('>>>>> invalid job name found: ', name);
      break;
  }
  return result;
};
