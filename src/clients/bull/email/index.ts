import path from 'path';
import { Worker } from 'bullmq';
import { JobNames, QueueNames } from '../../../lib/constants/jobScheduler';
import { _BullClient } from '../base';
import { RedisClient } from '../../redis';

export class _EmailBullClient extends _BullClient {
  constructor() {
    super(QueueNames.Email, 1);
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
          limiter: {
            max: 14,
            duration: 10000,
          },
        },
      );

      worker.on('completed', this._onJobComplete);
      worker.on('failed', this._onJobFailed);

      this._workers.push(worker);
    }
  };

  // https://crontab.cronhub.io/
  initCronJobs = () => {
    this.createJob(JobNames.UpdateBouncedEmails, null, { jobId: `${JobNames.UpdateBouncedEmails}-twice-per-hour`, repeat: { cron: '*/30 * * * *' } });
    this.createJob(JobNames.SendAccountCreationReminderEmail, null, { jobId: `${JobNames.SendAccountCreationReminderEmail}-daily`, repeat: { cron: '0 14 * * *' } });
  };
}

export const EmailBullClient = new _EmailBullClient();
