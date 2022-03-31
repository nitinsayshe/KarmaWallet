import Redis from 'ioredis';
import { ErrorTypes } from '../lib/constants';
import CustomError from '../lib/customError';
import { ConnectionClient } from './connectionClient';

const {
  REDIS_USER,
  REDIS_PASS,
  REDIS_URL,
  REDIS_PORT,
} = process.env;

export class _RedisClient extends ConnectionClient {
  pub: Redis.Redis;
  sub: Redis.Redis;
  _consumerName = '';

  constructor(consumerName: string = '') {
    super('Redis');
    this._consumerName = consumerName;
  }

  _connect = () => {
    const requiredConfigs = process.env.NODE_ENV === 'development'
      ? [REDIS_URL, REDIS_PORT]
      : [REDIS_USER, REDIS_PASS, REDIS_URL, REDIS_PORT];

    if (!requiredConfigs.every(s => !!s)) {
      throw new CustomError('Redis client unavailable. Necessary configurations not found.', ErrorTypes.SERVER);
    }

    this.pub = new Redis(
      `redis://${REDIS_USER}:${REDIS_PASS}@${REDIS_URL}:${REDIS_PORT}/4?allowUsernameInURI=true`,
      {
        lazyConnect: true,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      },
    );
    return this.pub.connect()
      .then(() => {
        this.sub = this.pub.duplicate();
        console.log(`Connected successfully to Redis${!!this._consumerName ? ` in ${this._consumerName}` : ''}`);
      })
      .catch(err => {
        console.log('rate limiter error');
        console.log(err);
      });
  };
}

export const RedisClient = new _RedisClient();
