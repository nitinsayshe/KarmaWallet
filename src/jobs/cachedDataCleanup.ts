import { SandboxedJob } from 'bullmq';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { JobNames } from '../lib/constants/jobScheduler';
import { CachedDataModel } from '../models/cachedData';
import { asCustomError } from '../lib/customError';

dayjs.extend(utc);

/**
 * iterates over all cachedData documents and deletes expired
 */

export const exec = async () => {
  const cachedDataDocuments = await CachedDataModel.find({});
  for (const cachedDataDocument of cachedDataDocuments) {
    try {
      if (!dayjs(cachedDataDocument.ttl).isBefore(dayjs().utc().toDate())) continue;
      await cachedDataDocument.delete();
    } catch (err) {
      throw asCustomError(err);
    }
  }
  return 'Expired cachedData documents removed.';
};

export const onComplete = () => {
  console.log(`${JobNames.CachedDataCleanup} finished`);
};

export const onFailed = (_: SandboxedJob, err: Error) => {
  console.log(`${JobNames.CachedDataCleanup} failed`);
  console.log(err);
};
