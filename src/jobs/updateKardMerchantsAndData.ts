import { SandboxedJob } from 'bullmq';
import { KardClient } from '../clients/kard';
import { GetRewardsMerchantsResponse } from '../clients/kard/types';
import { KardMerchantIterationRequest, KardMerchantIterationResponse, iterateOverKardMerchantsAndExecWithDelay } from '../integrations/kard';
import { JobNames } from '../lib/constants/jobScheduler';
import { updateKardMerchants, updateKardMerchantRates } from '../services/scripts/kardMerchantUpdate';

/**
 * pulls kard data and updates the database
 */

export const backoffMs = 1000;

export const updateMerchantsAndMerchantRates = async (
  _: KardMerchantIterationRequest<undefined>,
  merchantBatch: GetRewardsMerchantsResponse,
): Promise<KardMerchantIterationResponse<{updatedMerchants: string[], newRates: {[key: string]: number}}>[]> => {
  const updatedMerchants = await updateKardMerchants(merchantBatch);
  const newRates = await updateKardMerchantRates(merchantBatch);

  const response: KardMerchantIterationResponse<{updatedMerchants: string[], newRates: {[key: string]: number}}> = {
    fields:
      {
        updatedMerchants: updatedMerchants.map((m) => m.name),
        newRates: newRates.reduce((acc, rate) => {
          if (!acc[rate.integrations.kard.name]) {
            acc[rate.integrations.kard.name] = 1;
          } else {
            acc[rate.integrations.kard.name]++;
          }
          return acc;
        }, {} as {[key: string]: number}),
      },
  };
  return [response];
};

export const exec = async () => {
  const req = {
    client: new KardClient(),
    batchLimit: 75,
  };

  const reports = await iterateOverKardMerchantsAndExecWithDelay(
    req,
    updateMerchantsAndMerchantRates,
    backoffMs,
  );
  const updatedMerchants = reports.map((r) => r.fields.updatedMerchants).flat();
  const newRates = reports.map((r) => r.fields.newRates).reduce((acc, rates) => {
    for (const [key, value] of Object.entries(rates)) {
      if (!acc[key]) {
        acc[key] = value;
      } else {
        acc[key] += value;
      }
    }
    return acc;
  }, {} as {[key: string]: number});

  console.log(`[+] Updated ${updatedMerchants.length} merchants`);
  console.log(`[+] Updated merchants: ${JSON.stringify(updatedMerchants)}`);
  console.log(`[+] Added ${Object.keys(newRates).length} new rates`);
  console.log(`[+] New rates: ${JSON.stringify(newRates)}`);
  console.log('[+] Kard data updated');
};

export const onComplete = () => {
  console.log(`${JobNames.UpdateKardMerchantsAndData} finished`);
};

export const onFailed = (_: SandboxedJob, err: Error) => {
  console.log(`${JobNames.UpdateKardMerchantsAndData} failed`);
  console.log(err);
};
