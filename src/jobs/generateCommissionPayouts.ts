import { SandboxedJob } from 'bullmq';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { JobNames } from '../lib/constants/jobScheduler';
import { asCustomError } from '../lib/customError';

dayjs.extend(utc);

/**
 * a job that will generate payouts for all the commissions per user
 */

export const exec = async () => {
  // TODO: verify dates of Wildfire payment to Karma, adjust corn job accordingly; verify status of commission to include
  // At 03:00 AM, on day 5 of the month, only in January, April, July, and October
  // wait for wildfirepayment, run cron job, get commissions with confirmed/paid status to generate payout
  try {
    console.log('generating commission payout');
  } catch (err) {
    throw asCustomError(err);
  }
};

export const onComplete = () => {
  console.log(`${JobNames.GenerateCommissionPayouts} finished`);
};

export const onFailed = (_: SandboxedJob, err: Error) => {
  console.log(`${JobNames.GenerateCommissionPayouts} failed`);
  console.log(err);
};
