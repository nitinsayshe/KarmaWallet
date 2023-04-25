import {
  FlowJob,
  FlowProducer,
  Job,
  JobsOptions,
  Queue,
  QueueBaseOptions,
  QueueOptions,
  QueueScheduler,
  QueueSchedulerOptions,
  SandboxedJob,
  Worker,
  WorkerOptions,
} from 'bullmq';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { ConnectionClient } from '../connectionClient';
import { _RedisClient, RedisClient } from '../redis';

dayjs.extend(utc);

export const MAX_WORKERS = 4;

interface IJobDictionary {
  onComplete?(job: Job | SandboxedJob, result: any): void;
  onFailure?(job: Job | SandboxedJob, err: Error): void;
}

// custom tyoe to support optional queueName
// since FlowJob requires it.
interface IFlowJob {
  name: string;
  queueName?: string;
  data?: any;
  prefix?: string;
  opts?: Omit<JobsOptions, 'parent' | 'repeat'>;
  children?: FlowJob[];
  altOpts?: IJobDictionary;
}

export interface INextJob {
  name: string;
  data?: any;
  options?: JobsOptions;
}

export interface IJobResult {
  nextJobs?: INextJob[];
}

export abstract class _BullClient extends ConnectionClient {
  protected _queueName: string;
  protected _numWorkers: number;
  protected _queue: Queue = null;
  protected _flow: FlowProducer = null;
  protected _scheduler: QueueScheduler = null;
  protected _workers: Worker[] = [];
  protected _schedulerOptions: QueueSchedulerOptions = {};
  protected _queueOptions: QueueOptions = {};
  protected _flowOptions: QueueBaseOptions = {};
  protected _workerOptions: WorkerOptions = {};
  protected _jobOptions: JobsOptions = {};
  protected _jobsDictionary: {[key: string]: IJobDictionary} = {};

  static defaultSchedulerOpts: QueueSchedulerOptions = {};

  static defaultQueueOpts: QueueOptions = {};

  static defaultFlowOpts: QueueBaseOptions = {};

  static defaultWorkerOpts: WorkerOptions = {};

  static defaultJobOpts: JobsOptions = {};

  constructor(
    queueName: string,
    numWorkers: number = MAX_WORKERS,
    schedulerOpts: QueueSchedulerOptions = {},
    queueOpts: QueueOptions = {},
    flowOpts: QueueBaseOptions = {},
    workerOpts: WorkerOptions = {},
    jobOpts: JobsOptions = {},
  ) {
    super(queueName);
    this._queueName = queueName;
    this._flowOptions = flowOpts;
    this._numWorkers = numWorkers;
    this._schedulerOptions = schedulerOpts;
    this._queueOptions = queueOpts;
    this._workerOptions = workerOpts;
    this._jobOptions = jobOpts;
  }

  get queue() { return this._queue || null; }
  get flow() { return this._flow || null; }
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

    this._flow = new FlowProducer({
      ..._BullClient.defaultFlowOpts,
      connection: RedisClient.pub,
      ...this._flowOptions,
    });

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
  protected _processJob?(job: Job | SandboxedJob): Promise<any>;

  initCronJobs?(): void;

  createFlow = (name: string, children: IFlowJob[], opts: JobsOptions = {}, altOpts: IJobDictionary = {}) => {
    children.forEach(c => {
      if (c.altOpts) this._jobsDictionary[c.name] = altOpts;
    });

    this._flow.add(
      {
        name,
        queueName: this._queueName,
        opts: { ..._BullClient.defaultFlowOpts, ...this._flowOptions, ...opts },
        children: children.map(c => ({
          ...c,
          queueName: c.queueName || this._queueName,
          opts: { ..._BullClient.defaultJobOpts, ...this._jobOptions, ...(c.opts || {}) },
        })),
      },
    );
  };

  createJob = (name: string, data: any, opts: JobsOptions = {}, altOpts: IJobDictionary = {}) => {
    this._jobsDictionary[name] = altOpts;
    this._queue.add(name, data, { ..._BullClient.defaultJobOpts, ...this._jobOptions, ...opts });
  };

  protected _onJobComplete = async (job: Job | SandboxedJob, result: IJobResult) => {
    console.log('\n\n+-------------------------------------------+');
    if (this._jobsDictionary[job.name]?.onComplete) {
      this._jobsDictionary[job.name]?.onComplete(job, result);
    } else {
      console.log(`\n[+] Job: ${job.name} completed successfully`);
      console.log(result, '\n');
    }
    console.log(`timestamp: ${dayjs().utc().format('MMM DD, YYYY @ hh:mmA UTC')}`);
    console.log('+-------------------------------------------+\n\n');

    if (!!result?.nextJobs?.length) {
      result.nextJobs.map(({ name, data, options }) => this.createJob(name, data, options));
    }
  };

  protected _onJobFailed = async (job: Job | SandboxedJob, err: Error) => {
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
