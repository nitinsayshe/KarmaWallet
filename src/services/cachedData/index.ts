import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { ErrorTypes } from '../../lib/constants';
import CustomError from '../../lib/customError';
import { CacheDataModel, ICachedData } from '../../models/cachedData';

dayjs.extend(utc);

const DEFAULT_TTL = 1000 * 60 * 60 * 24 * 1;

const getTtlDate = (ttlMs: number) => dayjs().utc().add(ttlMs, 'ms').toDate();

export interface ICreateCachedDataParams {
  key: string,
  value: any,
  ttlMs?: number,
}

export const createCachedData = async ({ key, value, ttlMs = DEFAULT_TTL }: ICreateCachedDataParams): Promise<ICachedData> => {
  if (!key) {
    throw new CustomError('Key is required', ErrorTypes.INVALID_ARG);
  }
  if (!value) {
    throw new CustomError('Value is required', ErrorTypes.INVALID_ARG);
  }
  const ttl = getTtlDate(ttlMs);
  const cachedData = {
    key,
    value,
    ttl,
    lastUpdated: dayjs().utc().toDate(),
  };
  await CacheDataModel.findOneAndUpdate({ key }, cachedData, { upsert: true }).lean();
  return cachedData;
};

export const getCachedData = async (key: string): Promise<ICachedData> => {
  if (!key) {
    throw new CustomError('Key is required', ErrorTypes.INVALID_ARG);
  }
  const cachedData = await CacheDataModel.findOne({ key }).lean();
  // deciding not to throw an error here
  // so individual services can handle appropriately
  if (!cachedData) return null;
  if (new Date(cachedData.ttl).valueOf() < new Date(cachedData.lastUpdated).valueOf()) {
    return null;
  }
  return cachedData;
};

export const deleteCachedData = async (key: string) => {
  if (!key) {
    throw new CustomError('Key is required', ErrorTypes.INVALID_ARG);
  }
  const deletedCachedData = await CacheDataModel.findOneAndDelete({ key });
  return deletedCachedData;
};
