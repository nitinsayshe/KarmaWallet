import path from 'path';
import { Worker } from 'bullmq';
import { JobNames, QueueNames, CsvReportTypes, UserReportType, StatementReportType } from '../../../lib/constants/jobScheduler';
import { _BullClient } from '../base';
import { RedisClient } from '../../redis';
import { ActiveCampaignSyncTypes } from '../../../lib/constants/activecampaign';

export class _MainBullClient extends _BullClient {
  constructor() {
    super(QueueNames.Main);
  }

  _initWorkers = () => {
    for (let i = 0; i < this._numWorkers; i++) {
      const worker = new Worker(
        this._queueName,
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        // !!!              IMPORTANT           !!!
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        //
        // ALWAYS USE .js HERE!!!!!
        // THIS IS REFERENCING THE FILE INSIDE /dist
        // NOT THE .ts FILE YOU ARE WRITING FOR THIS
        // CLIENT
        path.resolve(__dirname, 'processor.js'),
        {
          ..._BullClient.defaultWorkerOpts,
          connection: RedisClient.pub,
          ...this._workerOptions,
        },
      );

      worker.on('completed', this._onJobComplete);
      worker.on('failed', this._onJobFailed);

      this._workers.push(worker);
    }
  };

  // https://crontab.cronhub.io/
  // https://www.npmjs.com/package/cron-parser - Package BullMQ uses to parse these
  initCronJobs = () => {
    this.createJob(JobNames.CachedDataCleanup, null, { jobId: `${JobNames.CachedDataCleanup}-bihourly`, repeat: { cron: '0 */2 * * *' } });
    this.createJob(JobNames.CacheGroupOffsetData, null, { jobId: `${JobNames.CacheGroupOffsetData}-bihourly`, repeat: { cron: '0 */2 * * *' } });
    this.createJob(JobNames.GenerateAdminSummaryReport, null, { jobId: `${JobNames.GenerateAdminSummaryReport}-bihourly`, repeat: { cron: '0 */2 * * *' } });
    this.createJob(JobNames.GenerateUserReport, { reportType: UserReportType.Historical }, { jobId: `${JobNames.GenerateUserReport}-historical-bihourly`, repeat: { cron: '0 */2 * * *' } });
    this.createJob(JobNames.GenerateUserReport, { reportType: UserReportType.ThirtyDays }, { jobId: `${JobNames.GenerateUserReport}-thirty-days-bihourly`, repeat: { cron: '0 */2 * * *' } });
    this.createJob(JobNames.GenerateGroupOffsetStatements, { reportType: StatementReportType.MonthlyIdempotent }, { jobId: `${JobNames.GenerateGroupOffsetStatements}-monthly`, repeat: { cron: '0 3 1 * *' } });
    this.createJob(JobNames.GlobalPlaidTransactionMapper, null, { jobId: `${JobNames.GlobalPlaidTransactionMapper}-daily`, repeat: { cron: '0 3 * * *' } });
    this.createJob(JobNames.TotalOffsetsForAllUsers, null, { jobId: `${JobNames.TotalOffsetsForAllUsers}-bihourly`, repeat: { cron: '0 */2 * * *' } });
    this.createJob(JobNames.UpdateRareProjectAverage, null, { jobId: `${JobNames.UpdateRareProjectAverage}-daily`, repeat: { cron: '0 17 * * *' } });
    this.createJob(JobNames.UserMonthlyImpactReport, { generateFullHistory: false }, { jobId: `${JobNames.UserMonthlyImpactReport}-monthly`, repeat: { cron: '0 3 1 * *' } });
    this.createJob(JobNames.UpdateWildfireMerchantsAndData, null, { jobId: `${JobNames.UpdateWildfireMerchantsAndData}-every-six-hours`, repeat: { cron: '0 0 */6 * * *' } });
    this.createJob(JobNames.UpdateKardMerchantsAndData, null, { jobId: `${JobNames.UpdateKardMerchantsAndData}-every-six-hours`, repeat: { cron: '0 0 */6 * * *' } });
    // TODO: verify dates of Wildfire payment to Karma, adjust corn job accordingly
    // At 03:00 AM, on day 5 of the month, only in January, April, July, and October
    this.createJob(JobNames.GenerateCommissionPayouts, null, { jobId: `${JobNames.GenerateCommissionPayouts}-quarterly`, repeat: { cron: '0 0 3 5 1,4,7,10 *' } });
    this.createJob(JobNames.UpdateWildfireCommissions, null, { jobId: `${JobNames.UpdateWildfireCommissions}-daily`, repeat: { cron: '0 5 * * *' } });

    if (process.env.NODE_ENV === 'production') {
      // active campaign sync
      this.createJob(JobNames.SyncActiveCampaign, { syncType: ActiveCampaignSyncTypes.ARTICLE_RECOMMENDATION }, { jobId: `${JobNames.SyncActiveCampaign}-article-recommendation`, repeat: { cron: '0 2 * * 1' } });
      this.createJob(JobNames.SyncActiveCampaign, { syncType: ActiveCampaignSyncTypes.UNLINKED_AND_REMOVED_ACCOUNTS }, { jobId: `${JobNames.SyncActiveCampaign}-unlinked-and-removed-accounts`, repeat: { cron: '0 4 9 * *' } });
      this.createJob(JobNames.SyncActiveCampaign, { syncType: ActiveCampaignSyncTypes.CASHBACK_SIMULATION }, { jobId: `${JobNames.SyncActiveCampaign}-cashback-simulation`, repeat: { cron: '0 4 1 * *' } });
      this.createJob(JobNames.SyncActiveCampaign, { syncType: ActiveCampaignSyncTypes.SPENDING_ANALYSIS }, { jobId: `${JobNames.SyncActiveCampaign}-spending-analysis`, repeat: { cron: '0 4 28 * *' } });
      this.createJob(JobNames.SyncActiveCampaign, { syncType: ActiveCampaignSyncTypes.DAILY }, { jobId: `${JobNames.SyncActiveCampaign}-daily`, repeat: { cron: '0 7 * * *' } });
      this.createJob(JobNames.SyncActiveCampaign, { syncType: ActiveCampaignSyncTypes.WEEKLY }, { jobId: `${JobNames.SyncActiveCampaign}-weekly`, repeat: { cron: '0 7 * * 0' } });
      this.createJob(JobNames.SyncActiveCampaign, { syncType: ActiveCampaignSyncTypes.MONTHLY }, { jobId: `${JobNames.SyncActiveCampaign}-monthly`, repeat: { cron: '0 7 1 * *' } });
      this.createJob(JobNames.SyncActiveCampaign, { syncType: ActiveCampaignSyncTypes.QUARTERLY }, { jobId: `${JobNames.SyncActiveCampaign}-quarterly`, repeat: { cron: '0 7 1 */3 *' } });
      this.createJob(JobNames.SyncActiveCampaign, { syncType: ActiveCampaignSyncTypes.YEARLY }, { jobId: `${JobNames.SyncActiveCampaign}-yearly`, repeat: { cron: '0 7 1 1 *' } });

      this.createJob(
        JobNames.UploadCsvToGoogleDrive,
        { reportType: CsvReportTypes.Affiliates },
        { jobId: `${JobNames.UploadCsvToGoogleDrive}-${CsvReportTypes.Affiliates}-monthly`,
          repeat: { cron: '0 5 2 * *' } },
      );
      this.createJob(
        JobNames.UploadCsvToGoogleDrive,
        { reportType: CsvReportTypes.Transactions },
        { jobId: `${JobNames.UploadCsvToGoogleDrive}-${CsvReportTypes.Transactions}-daily`,
          repeat: { cron: '0 7 * * *' } },
      );
      this.createJob(
        JobNames.UploadCsvToGoogleDrive,
        { reportType: CsvReportTypes.Users },
        { jobId: `${JobNames.UploadCsvToGoogleDrive}-${CsvReportTypes.Users}-daily`,
          repeat: { cron: '0 7 * * *' } },
      );
    }
  };
}

export const MainBullClient = new _MainBullClient();
