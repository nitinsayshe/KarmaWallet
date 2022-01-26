import Redis from 'ioredis';
import { Client } from './client';

const {
  REDIS_USER,
  REDIS_PASS,
  REDIS_URL,
  REDIS_PORT,
} = process.env;

class _RedisClient extends Client {
  pub: Redis.Redis;
  sub: Redis.Redis;

  constructor() {
    super('Redis');
  }

  _connect = async () => {
    // if (![REDIS_USER, REDIS_PASS, REDIS_URL, REDIS_PORT].every(s => !!s)) {
    //   throw new CustomError('Redis client unavailable. Necessary configurations not found.', ErrorTypes.SERVER);
    // }

    // this.pub = new Redis(`redis://${REDIS_USER}:${REDIS_PASS}@${REDIS_URL}:${REDIS_PORT}?allowUsernameInURI=true`);
    this.pub = new Redis();
    this.sub = this.pub.duplicate();
  };
}

export const RedisClient = new _RedisClient();
