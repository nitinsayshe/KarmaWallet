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

const MAX_WORKERS = 4;

export class _BullClient extends Client {
  private _queue: Queue = null;
  private _scheduler: QueueScheduler = null;
  private _workers: Worker[] = [];

  static defaultSchedulerOpts: QueueSchedulerOptions = {};

  static defaultQueueOpts: QueueOptions = {
    connection: RedisClient.pub,
  };

  static defaultWorkerOpts: WorkerOptions = {};

  static defaultJobOpts: JobsOptions = {};

  constructor() {
    super('Bull');
  }

  get queue() { return this._queue || null; }
  get scheduler() { return this._scheduler || null; }
  get workers() { return this._workers || []; }

  _connect = async () => {
    this._queue = new Queue(QueueNames.Main, _BullClient.defaultQueueOpts);

    // workers should only exist on the big ol' betsi
    // server and not on the smaller betsi instances.
    // TODO: provide real BETSI_ENV env var value
    if (process.env.BETSI_ENV === 'bigolbetsi') {
      this._scheduler = new QueueScheduler(
        QueueNames.Main,
        {
          ..._BullClient.defaultQueueOpts,
          // cannot include connection in default opts
          // since schedulers cant share ioredis instances
          connection: new _RedisClient(),
        },
      );

      for (let i = 0; i < MAX_WORKERS; i++) {
        const worker = new Worker(QueueNames.Main, this._processJob, _BullClient.defaultWorkerOpts);

        worker.on('completed', this._onJobComplete);
        worker.on('failed', this._onJobFailed);

        this._workers.push(worker);
      }
    }
  };

  createJob = (name: string, data: any, opts: JobsOptions = {}) => {
    this._queue.add(name, data, { ..._BullClient.defaultJobOpts, ...opts });
  };

  private _onJobComplete = (job: Job, result: any) => {
    switch (job.name) {
      case 'dummy':
        console.log('>>>>> doing something specific to dummy job completion');
        break;
      default:
        console.log(`job ${job.id} complete`, result);
        break;
    }
  };

  private _onJobFailed = (job: Job, err: Error) => {
    switch (job.name) {
      case 'dummy':
        console.log('>>>>> doing something specific to dummy job failure');
        break;
      default:
        console.log(`job ${job.id} failed`, err);
        break;
    }
  };

  private _processJob = async (job: Job) => {
    switch (job.name) {
      case 'dummy':
        console.log('>>>>> dummy placeholder...');
        break;
      default:
        console.log('>>>>> invalid job name found');
        break;
    }
  };
}

export const BullClient = new _BullClient();
