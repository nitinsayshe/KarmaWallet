import path from 'path';
import { Job, SandboxedJob, Worker } from 'bullmq';
import { QueueNames, JobNames } from '../../../lib/constants/jobScheduler';
import { _BullClient } from '../base';
import * as UserPlaidTransactionMapper from '../../../jobs/userPlaidTransactionMap';
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
  _addCronJobs = () => {
    this.createJob(JobNames.GlobalPlaidTransactionMapper, null, { jobId: `${JobNames.GlobalPlaidTransactionMapper}-bihourly`, repeat: { cron: '0 */2 * * *' } });
  };

  _onJobComplete = async (job: Job | SandboxedJob, result: any) => {
    switch (job.name) {
      case 'dummy':
        console.log('>>>>> doing something specific to dummy job completion');
        break;
      case JobNames.UserPlaidTransactionMapper:
        UserPlaidTransactionMapper.onComplete(job as SandboxedJob, result);
        break;
      case JobNames.GlobalPlaidTransactionMapper:
        console.log(`${JobNames.GlobalPlaidTransactionMapper} finished: \n ${JSON.stringify(result)}`);
        break;
      default:
        console.log(`job ${job.id} complete`, result);
        break;
    }
  };

  _onJobFailed = async (job: Job | SandboxedJob, err: Error) => {
    switch (job.name) {
      case 'dummy':
        console.log('>>>>> doing something specific to dummy job failure');
        break;
      default:
        console.log(`job ${job.id} failed`, err);
        break;
    }
  };
}

export const MainBullClient = new _MainBullClient();
