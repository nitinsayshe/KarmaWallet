import { nanoid } from 'nanoid';
import { authTokenDays } from '../../lib/constants';
import { RedisClient } from '../../clients/redis';

export const createSession = async (uid: string) => {
  const authKey = nanoid(16);
  // https://redis.io/commands/set
  await RedisClient.pub.set(authKey, uid, 'nx', 'ex', (60 * 60 * 24) * authTokenDays);
  return authKey;
};

export const verifySession = async (authKey: string) => {
  const uid = await RedisClient.pub.get(authKey);
  return uid || '';
};

export const revokeSession = async (authKey: string) => {
  await RedisClient.pub.del(authKey);
};
