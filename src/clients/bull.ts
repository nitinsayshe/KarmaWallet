import {
  Job,
  JobsOptions,
  Queue,
  QueueOptions,
  QueueScheduler,
  QueueSchedulerOptions,
  Worker,
  WorkerOptions,
} from 'bullmq';
import { QueueNames } from '../lib/constants/jobScheduler';
import { Client } from './client';
import { _RedisClient, RedisClient } from './redis';
import * as PlaidIntegration from '../integrations/plaid';
import * as UserPlaidTransactionMapper from '../jobs/userPlaidTransactionMap';
import { mockRequest } from '../lib/constants/request';

const MAX_WORKERS = 4;

abstract class _BullClient extends Client {
  protected _queueName: string;
  protected _numWorkers: number;
  protected _queue: Queue = null;
  protected _scheduler: QueueScheduler = null;
  protected _workers: Worker[] = [];
  protected _schedulerOptions: QueueSchedulerOptions = {};
  protected _queueOptions: QueueOptions = {};
  protected _workerOptions: WorkerOptions = {};
  protected _jobOptions: JobsOptions = {};

  static defaultSchedulerOpts: QueueSchedulerOptions = {};

  static defaultQueueOpts: QueueOptions = {
    connection: RedisClient.pub,
  };

  static defaultWorkerOpts: WorkerOptions = {};

  static defaultJobOpts: JobsOptions = {};

  constructor(
    queueName: string,
    numWorkers: number = MAX_WORKERS,
    schedulerOpts: QueueSchedulerOptions = {},
    queueOpts: QueueOptions = {},
    workerOpts: WorkerOptions = {},
    jobOpts: JobsOptions = {},
  ) {
    super(queueName);
    this._queueName = queueName;
    this._numWorkers = numWorkers;
    this._schedulerOptions = schedulerOpts;
    this._queueOptions = queueOpts;
    this._workerOptions = workerOpts;
    this._jobOptions = jobOpts;
  }

  get queue() { return this._queue || null; }
  get scheduler() { return this._scheduler || null; }
  get workers() { return this._workers || []; }

  _connect = async () => {
    this._queue = new Queue(this._queueName, { ..._BullClient.defaultQueueOpts, ...this._queueOptions });

    // workers should only exist on the big ol' betsi
    // server and not on the smaller betsi instances.
    // TODO: provide real BETSI_ENV env var value
    if (process.env.BETSI_ENV === 'bigolbetsi') {
      this._scheduler = new QueueScheduler(
        this._queueName,
        {
          ..._BullClient.defaultQueueOpts,
          // cannot include connection in default opts
          // since schedulers cant share ioredis instances
          connection: new _RedisClient(),
          ...this._schedulerOptions,
        },
      );

      for (let i = 0; i < this._numWorkers; i++) {
        const worker = new Worker(this._queueName, this._processJob, { ..._BullClient.defaultWorkerOpts, ...this._workerOptions });

        worker.on('completed', this._onJobComplete);
        worker.on('failed', this._onJobFailed);

        this._workers.push(worker);
      }
    }
  };

  abstract _onJobComplete (job: Job, result: any): Promise<void>;
  abstract _onJobFailed (job: Job, error: Error): Promise<void>;
  abstract _processJob (job: Job): Promise<void>;

  createJob = (name: string, data: any, opts: JobsOptions = {}) => {
    this._queue.add(name, data, { ..._BullClient.defaultJobOpts, ...this._jobOptions, ...opts });
  };
}

export class _MainBullClient extends _BullClient {
  constructor() {
    super(QueueNames.Main, 2);
  }

  _onJobComplete = async (job: Job, result: any) => {
    switch (job.name) {
      case 'dummy':
        console.log('>>>>> doing something specific to dummy job completion');
        break;
      case 'user-plaid-transaction-mapper':
        UserPlaidTransactionMapper.onComplete(job, result);
        break;
      default:
        console.log(`job ${job.id} complete`, result);
        break;
    }
  };

  _onJobFailed = async (job: Job, err: Error) => {
    switch (job.name) {
      case 'dummy':
        console.log('>>>>> doing something specific to dummy job failure');
        break;
      default:
        console.log(`job ${job.id} failed`, err);
        break;
    }
  };

  _processJob = async (job: Job) => {
    // global plaid transaction mapping
    // ind. user linked card plaid transaction mapping
    // sending email (multiple kinds and types)
    // user impact score calculation (run this after global plaid transactions)
    // run reports calc (users report)
    switch (job.name) {
      case 'global-plaid-transaction-mapper':
        await PlaidIntegration.mapTransactionsFromPlaid(mockRequest);
        break;
      case 'user-plaid-transaction-mapper':
        UserPlaidTransactionMapper.exec(job);
        break;
      default:
        console.log('>>>>> invalid job name found');
        break;
    }
  };
}

export const MainBullClient = new _MainBullClient();
