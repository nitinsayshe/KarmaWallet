import { SandboxedJob } from 'bullmq';
import { JobNames } from '../lib/constants/jobScheduler';
import { updateKardMerchants, updateKardMerchantRates } from '../services/scripts/kardMerchantUpdate';

/**
 * pulls kard data and updates the database
 */

export const exec = async () => {
  await updateKardMerchants();
  await updateKardMerchantRates();
  console.log('[+] Kard data updated');
};

export const onComplete = () => {
  console.log(`${JobNames.UpdateKardMerchantsAndData} finished`);
};

export const onFailed = (_: SandboxedJob, err: Error) => {
  console.log(`${JobNames.UpdateKardMerchantsAndData} failed`);
  console.log(err);
};
