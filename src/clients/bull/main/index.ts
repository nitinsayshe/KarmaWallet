import path from 'path';
import { Job, SandboxedJob, Worker } from 'bullmq';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { QueueNames, JobNames } from '../../../lib/constants/jobScheduler';
import { _BullClient } from '../base';
import { RedisClient } from '../../redis';

dayjs.extend(utc);

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
    this.createJob(JobNames.TotalOffsetsForAllUsers, null, { jobId: `${JobNames.TotalOffsetsForAllUsers}-bihourly`, repeat: { cron: '0 */2 * * *' } });
    this.createJob(JobNames.TransactionsMonitor, null, { jobId: JobNames.TransactionsMonitor, repeat: { cron: '0 3 * * *' } });

    this.createFlow(
      JobNames.GenerateUserTransactionTotals,
      [
        {
          name: JobNames.GlobalPlaidTransactionMapper,
          opts: { jobId: `${JobNames.GlobalPlaidTransactionMapper}-bihourly` },
        },
      ],
      { jobId: `${JobNames.GenerateUserTransactionTotals}-bihourly`, repeat: { cron: '0 */2 * * *' } },
    );
  };

  _onJobComplete = async (job: Job | SandboxedJob, result: any) => {
    console.log('\n\n+-------------------------------------------+');
    if (this._jobsDictionary[job.name]?.onComplete) {
      this._jobsDictionary[job.name]?.onComplete(job, result);
    } else {
      console.log(`\n[+] Job: ${job.name} completed successfully`);
      console.log(result, '\n');
    }
    console.log(`timestamp: ${dayjs().utc().format('MMM DD, YYYY @ hh:mmA UTC')}`);
    console.log('+-------------------------------------------+\n\n');
  };

  _onJobFailed = async (job: Job | SandboxedJob, err: Error) => {
    console.log('\n\n+-------------------------------------------+');
    if (!!this._jobsDictionary[job.name]?.onFailure) {
      this._jobsDictionary[job.name]?.onFailure(job, err);
    } else {
      console.log(`\n[-] Job: ${job.name} failed`);
      console.log(err, '\n');
    }
    console.log(`\ntimestamp: ${dayjs().utc().format('MMM DD, YYYY @ hh:mmA UTC')}`);
    console.log('+-------------------------------------------+\n\n');
  };
}

export const MainBullClient = new _MainBullClient();
