import {
  Job, Queue, QueueScheduler, Worker,
} from 'bullmq';
import { QueueNames } from '../lib/constants/jobScheduler';
import { Client } from './client';
import { _RedisClient, RedisClient } from './redis';

const MAX_WORKERS = 4;

export class _BullClient extends Client {
  private _queue: Queue = null;
  private _scheduler: QueueScheduler = null;
  private _workers: Worker[] = [];

  constructor() {
    super('Bull');
  }

  get queue() { return this._queue || null; }
  get scheduler() { return this._scheduler || null; }
  get workers() { return this._workers || []; }

  _connect = async () => {
    this._queue = new Queue(QueueNames.Main, { connection: RedisClient.pub });

    // workers should only exist on the big ol' betsi
    // server and not on the smaller betsi instances.
    // TODO: provide real BETSI_ENV env var value
    if (process.env.BETSI_ENV === 'bigolbetsi') {
      this._scheduler = new QueueScheduler(QueueNames.Main, { connection: new _RedisClient() });

      for (let i = 0; i < MAX_WORKERS; i++) {
        const worker = new Worker(QueueNames.Main, this._processJob);

        worker.on('completed', this._onJobComplete);
        worker.on('failed', this._onJobFailed);

        this._workers.push(worker);
      }
    }
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
