import { nanoid } from 'nanoid';
import { authTokenDays } from '../../lib/constants';
import { RedisClient } from '../../clients/redis';

export const create = async (uid: string) => {
  await RedisClient.init();
  const authKey = nanoid(16);
  // https://redis.io/commands/set
  await RedisClient.pub.set(authKey, uid, 'nx', 'ex', (60 * 60 * 24) * authTokenDays);
  return authKey;
};

export const verify = async (authKey: string) => {
  await RedisClient.init();
  const uid = await RedisClient.pub.get(authKey);
  return uid || '';
};

export const revoke = async (authKey: string) => {
  await RedisClient.init();
  await RedisClient.pub.del(authKey);
};
