import path from 'path';
import { Worker } from 'bullmq';
import { JobNames, QueueNames, CsvReportTypes } from '../../../lib/constants/jobScheduler';
import { _BullClient } from '../base';
import { RedisClient } from '../../redis';

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
  initCronJobs = () => {
    this.createJob(JobNames.CachedDataCleanup, null, { jobId: `${JobNames.CachedDataCleanup}-bihourly`, repeat: { cron: '0 */2 * * *' } });
    this.createJob(JobNames.CacheGroupOffsetData, null, { jobId: `${JobNames.CacheGroupOffsetData}-bihourly`, repeat: { cron: '0 */2 * * *' } });
    this.createJob(JobNames.GenerateGroupOffsetStatements, null, { jobId: `${JobNames.GenerateGroupOffsetStatements}-monthly`, repeat: { cron: '0 3 1 * *' } });
    this.createJob(JobNames.GlobalPlaidTransactionMapper, null, { jobId: `${JobNames.GlobalPlaidTransactionMapper}-bihourly`, repeat: { cron: '0 */2 * * *' } });
    this.createJob(JobNames.TotalOffsetsForAllUsers, null, { jobId: `${JobNames.TotalOffsetsForAllUsers}-bihourly`, repeat: { cron: '0 */2 * * *' } });
    this.createJob(JobNames.TransactionsMonitor, null, { jobId: JobNames.TransactionsMonitor, repeat: { cron: '0 3 * * *' } });
    this.createJob(JobNames.UpdateRareProjectAverage, null, { jobId: `${JobNames.UpdateRareProjectAverage}-daily`, repeat: { cron: '0 17 * * *' } });
    this.createJob(JobNames.UserMonthlyImpactReport, null, { jobId: `${JobNames.UserMonthlyImpactReport}-monthly`, repeat: { cron: '0 3 1 * *' } });
    if (process.env.NODE_ENV === 'production') {
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
