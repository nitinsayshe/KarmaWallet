import {
  Job,
  JobsOptions,
  Queue,
  QueueOptions,
  QueueScheduler,
  QueueSchedulerOptions,
  SandboxedJob,
  Worker,
  WorkerOptions,
} from 'bullmq';
import { Client } from '../client';
import { _RedisClient, RedisClient } from '../redis';

export const MAX_WORKERS = 4;

export abstract class _BullClient extends Client {
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

  static defaultQueueOpts: QueueOptions = {};

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
    this._queue = new Queue(
      this._queueName,
      {
        ..._BullClient.defaultQueueOpts,
        connection: RedisClient.pub,
        ...this._queueOptions,
      },
    );

    // workers should only exist on the big ol' betsi
    // server and not on the smaller betsi instances.
    // TODO: provide real BETSI_ENV env var value
    if (process.env.BETSI_ENV === 'bigolbetsi') {
      const redisClient = new _RedisClient(`${this._queueName} job scheduler`);
      await redisClient.init();
      this._scheduler = new QueueScheduler(
        this._queueName,
        {
          ..._BullClient.defaultQueueOpts,
          // cannot include connection in default opts
          // since schedulers cant share ioredis instances
          connection: redisClient.pub,
          ...this._schedulerOptions,
        },
      );

      this._initWorkers();
      this.initCronJobs?.();
    }
  };

  protected abstract _initWorkers (): void;
  protected abstract _onJobComplete (job: Job | SandboxedJob, result: any): Promise<void>;
  protected abstract _onJobFailed (job: Job | SandboxedJob, error: Error): Promise<void>;
  protected _processJob?(job: Job | SandboxedJob): Promise<any>;

  initCronJobs?(): void;

  createJob = (name: string, data: any, opts: JobsOptions = {}) => {
    this._queue.add(name, data, { ..._BullClient.defaultJobOpts, ...this._jobOptions, ...opts });
  };
}
