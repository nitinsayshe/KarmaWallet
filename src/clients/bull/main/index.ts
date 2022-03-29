import path from 'path';
import { Job, SandboxedJob, Worker } from 'bullmq';
import { QueueNames, JobNames } from '../../../lib/constants/jobScheduler';
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
    this.createJob(JobNames.TransactionsMonitor, null, { jobId: JobNames.TransactionsMonitor, repeat: { cron: '0 3 * * *' } });
    this.createJob(JobNames.GlobalPlaidTransactionMapper, null, { jobId: `${JobNames.GlobalPlaidTransactionMapper}-bihourly`, repeat: { cron: '0 */2 * * *' } });
    this.createJob(JobNames.CacheGroupOffsetData, null, { jobId: `${JobNames.CacheGroupOffsetData}-bihourly`, repeat: { cron: '0 */2 * * *' } });
  };

  _onJobComplete = async (job: Job | SandboxedJob, result: any) => {
    if (this._jobsDictionary[job.name]?.onComplete) {
      this._jobsDictionary[job.name]?.onComplete(job, result);
    } else {
      console.log(`\n[+] Job: ${job.name} completed successfully`);
      console.log(result, '\n');
    }
  };

  _onJobFailed = async (job: Job | SandboxedJob, err: Error) => {
    if (!!this._jobsDictionary[job.name]?.onFailure) {
      this._jobsDictionary[job.name]?.onFailure(job, err);
    } else {
      console.log(`\n[-] Job: ${job.name} failed`);
      console.log(err, '\n');
    }
  };
}

export const MainBullClient = new _MainBullClient();
