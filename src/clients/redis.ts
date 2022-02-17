import Redis from 'ioredis';
import { ErrorTypes } from '../lib/constants';
import CustomError from '../lib/customError';
import { Client } from './client';

const {
  REDIS_USER,
  REDIS_PASS,
  REDIS_URL,
  REDIS_PORT,
} = process.env;

export class _RedisClient extends Client {
  pub: Redis.Redis;
  sub: Redis.Redis;

  constructor() {
    super('Redis');
  }

  _connect = () => {
    if (![REDIS_USER, REDIS_PASS, REDIS_URL, REDIS_PORT].every(s => !!s)) {
      throw new CustomError('Redis client unavailable. Necessary configurations not found.', ErrorTypes.SERVER);
    }

    this.pub = new Redis(`redis://${REDIS_USER}:${REDIS_PASS}@${REDIS_URL}:${REDIS_PORT}/4?allowUsernameInURI=true`, { lazyConnect: true });
    return this.pub.connect()
      .then(() => {
        this.sub = this.pub.duplicate();
        console.log('Connected successfully to Redis');
      })
      .catch(err => {
        console.log('rate limiter error');
        console.log(err);
      });
  };
}

export const RedisClient = new _RedisClient();
