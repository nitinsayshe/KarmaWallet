/* eslint-disable camelcase */
import { SandboxedJob } from 'bullmq';
import { JobNames } from '../lib/constants/jobScheduler';
import { updateWildfireMerchants, updateWildfireMerchantRates } from '../services/scripts/wildfire';

/**
 * pulls wildfire data and updates the database
 */

export const exec = async () => {
  await updateWildfireMerchants();
  await updateWildfireMerchantRates();
  console.log('[+] wildfire data updated');
};

export const onComplete = () => {
  console.log(`${JobNames.UpdateWildfireMerchantsAndData} finished`);
};

export const onFailed = (_: SandboxedJob, err: Error) => {
  console.log(`${JobNames.UpdateWildfireMerchantsAndData} failed`);
  console.log(err);
};
