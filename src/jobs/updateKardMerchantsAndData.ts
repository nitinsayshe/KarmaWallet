import { SandboxedJob } from 'bullmq';
import { KardClient } from '../clients/kard';
import { GetRewardsMerchantsResponse } from '../clients/kard/types';
import { KardMerchantIterationRequest, KardMerchantIterationResponse, iterateOverKardMerchantsAndExecWithDelay, getMerchantsByNames } from '../integrations/kard';
import { JobNames, KardSyncType } from '../lib/constants/jobScheduler';
import { getUtcDate } from '../lib/date';
import { CashbackCompanyDisplayLocation, CompanyModel } from '../models/company';
import { IncomingMerchantsModel } from '../models/incomingMerchants';
import { MerchantModel } from '../models/merchant';
import { IMerchantRateDocument } from '../models/merchantRate';
import { updateKardMerchants, updateKardMerchantRates, narrowDownMatchesByScore, associateKardMatches, matchKardCompanies, AssociatedMatchResult, RestrictiveMatchScoreThreshold } from '../services/scripts/kardMerchantUpdate';

/**
 * pulls kard data and updates the database
 */

export const backoffMs = 1000;

const addRateToMapOrIncrement = (acc: { [key: string]: number }, rate: IMerchantRateDocument): { [key: string]: number } => {
  if (!acc[rate.integrations.kard.name]) {
    acc[rate.integrations.kard.name] = 1;
  } else {
    acc[rate.integrations.kard.name]++;
  }
  return acc;
};

const accumulateRates = (acc: { [key: string]: number }, rates: { [key: string]: number }): { [key: string]: number } => {
  for (const [key, value] of Object.entries(rates)) {
    if (!acc[key]) {
      acc[key] = value;
    } else {
      acc[key] += value;
    }
  }
  return acc;
};

export const updateMerchantBatch = async (
  _: KardMerchantIterationRequest<undefined>,
  merchantBatch: GetRewardsMerchantsResponse,
): Promise<KardMerchantIterationResponse<{ updatedMerchants: string[] }>[]> => {
  const updatedMerchants = await updateKardMerchants(merchantBatch);
  const response: KardMerchantIterationResponse<{ updatedMerchants: string[] }> = {
    fields: {
      updatedMerchants: updatedMerchants.map((m) => m.name),
    },
  };
  return [response];
};

export const updateMerchantRateBatch = async (
  _: KardMerchantIterationRequest<undefined>,
  merchantBatch: GetRewardsMerchantsResponse,
): Promise<KardMerchantIterationResponse<{ newRates: { [key: string]: number } }>[]> => {
  const newRates = await updateKardMerchantRates(merchantBatch);
  const response: KardMerchantIterationResponse<{ newRates: { [key: string]: number } }> = {
    fields: {
      newRates: newRates.reduce(addRateToMapOrIncrement, {} as { [key: string]: number }),
    },
  };
  return [response];
};

export const updateMerchantsAndMerchantRatesBatch = async (
  _: KardMerchantIterationRequest<undefined>,
  merchantBatch: GetRewardsMerchantsResponse,
): Promise<KardMerchantIterationResponse<{ updatedMerchants: string[], newRates: { [key: string]: number } }>[]> => {
  const updatedMerchants = await updateKardMerchants(merchantBatch);
  const newRates = await updateKardMerchantRates(merchantBatch);

  const response: KardMerchantIterationResponse<{ updatedMerchants: string[], newRates: { [key: string]: number } }> = {
    fields:
    {
      updatedMerchants: updatedMerchants.map((m) => m.name),
      newRates: newRates.reduce(addRateToMapOrIncrement, {} as { [key: string]: number }),
    },
  };
  return [response];
};

interface IJobData {
  syncType: KardSyncType;
}

const updateMerchantsAndMerchantRates = async () => {
  const req = {
    client: new KardClient(),
    batchLimit: 75,
  };

  const reports = await iterateOverKardMerchantsAndExecWithDelay(
    req,
    updateMerchantsAndMerchantRatesBatch,
    backoffMs,
  );
  const updatedMerchants = reports.map((r) => r.fields.updatedMerchants).flat();

  const newRates = reports.map((r) => r.fields.newRates).reduce(accumulateRates, {} as { [key: string]: number });

  console.log(`[+] Updated ${updatedMerchants.length} merchants`);
  console.log(`[+] Updated merchants: ${JSON.stringify(updatedMerchants)}`);
  console.log(`[+] Added ${Object.keys(newRates).length} new rates`);
  console.log(`[+] New rates: ${JSON.stringify(newRates)}`);
};

const updateKardMerchantsJob = async () => {
  const req = {
    client: new KardClient(),
    batchLimit: 75,
  };

  const reports = await iterateOverKardMerchantsAndExecWithDelay(
    req,
    updateMerchantBatch,
    backoffMs,
  );
  const updatedMerchants = reports.map((r) => r.fields.updatedMerchants).flat();

  console.log(`[+] Updated ${updatedMerchants.length} merchants`);
  console.log(`[+] Updated merchants: ${JSON.stringify(updatedMerchants)}`);
};

const updateKardMerchantRatesJob = async () => {
  const req = {
    client: new KardClient(),
    batchLimit: 75,
  };

  const reports = await iterateOverKardMerchantsAndExecWithDelay(
    req,
    updateMerchantRateBatch,
    backoffMs,
  );

  const newRates = reports.map((r) => r.fields.newRates).reduce(accumulateRates, {} as { [key: string]: number });

  console.log(`[+] Added ${Object.keys(newRates).length} new rates`);
  console.log(`[+] New rates: ${JSON.stringify(newRates)}`);
};

export const updateKarmaCollectiveStatus = async (matches: AssociatedMatchResult['matches']) => Promise.all(matches?.map(async (match) => {
  try {
    const merchant = await MerchantModel.findOne({ 'integrations.kard.id': match.merchantId });
    if (!merchant?._id) throw new Error(`No merchant found with id: ${match.merchantId}`);

    merchant.karmaCollectiveMember = true;
    merchant.lastModified = getUtcDate().toDate();
    await merchant.save();

    const company = await CompanyModel.findOne({ merchant: merchant._id });
    if (!company?._id) throw new Error(`No company found with merchant id: ${merchant._id}`);

    const companyHasFeaturedCashbackWithLocation = !!company?.featuredCashback?.location;
    const companyHasFeaturedCashbackScreenMobile = companyHasFeaturedCashbackWithLocation && company?.featuredCashback?.location?.includes?.(CashbackCompanyDisplayLocation.cashbackScreenMobile);
    let location = [CashbackCompanyDisplayLocation.cashbackScreenMobile];
    if (companyHasFeaturedCashbackScreenMobile) location = company.featuredCashback.location;
    else if (companyHasFeaturedCashbackWithLocation) location.push(CashbackCompanyDisplayLocation.cashbackScreenMobile);

    company.featuredCashback = {
      status: true,
      location,
    };
    company.lastModified = getUtcDate().toDate();
    await company.save();
  } catch (e) {
    console.log(`Error saving match: ${e}`);
  }
}));

export const matchKarmaCollectiveMerchants = async () => {
  // pull merchant names that need to be matched from the db
  const incomingMerchants = await IncomingMerchantsModel.find({ processed: false, dateScheduled: { $lte: new Date() } });

  let incomingMerchantNames = incomingMerchants?.map((m) => m.names)?.flat();
  // make these names unique
  incomingMerchantNames = [...new Set(incomingMerchantNames)];

  // if it only has a company name, fill in the merchant name
  // if it only has a merchant name, fill in the company name
  incomingMerchantNames = incomingMerchantNames.map((name) => {
    if (!!name.company && !name.merchant) {
      return { company: name.company, merchant: name.company };
    }
    if (!!name.merchant && !name.company) {
      return { company: name.merchant, merchant: name.merchant };
    }
    return name;
  });

  console.log(`Found ${incomingMerchantNames.length} incoming merchants`);
  console.log(JSON.stringify(incomingMerchantNames));

  // if a merchant already exists in the db, do not match it
  const merchantNames = (await Promise.all(incomingMerchantNames.map(async (name) => {
    try {
      const company = await CompanyModel.findOne({ companyName: name.company });
      if (!company?._id) {
        console.log(`No company wih name: ${name.company} found`);
        console.log('skipping for now...');
        return null;
      }

      const merchant = await MerchantModel.findOne({ name: name.merchant });
      if (!merchant?._id) {
        return name.merchant;
      }
      return null;
    } catch (e) {
      console.log(`Error finding merchant: ${e}`);
      return name.merchant;
    }
  })))?.filter((name) => !!name);

  if (!merchantNames?.length || merchantNames.length === 0) {
    console.log(`Merchants in provided list already exist in the db. Merchants:  ${JSON.stringify(merchantNames, null, 2)}`);
    return;
  }

  // iterate over the kard merchants to find matches
  // save matches in an array
  console.log(`Searching for merchants in kard after filtering out ones we already have a merchant or no company for: ${JSON.stringify(merchantNames)}`);
  const merchants = await getMerchantsByNames(merchantNames);
  if (merchants.length === 0) {
    console.log('No matching merchants found from kard');
    return;
  }

  const initalMatchingResults = await matchKardCompanies(merchants);
  console.log(`Found ${initalMatchingResults?.matches?.length || 0} initial matches`);

  const narrowedMatches = await narrowDownMatchesByScore({ minMatchScore: RestrictiveMatchScoreThreshold });
  console.log(`Found ${narrowedMatches?.length || 0} narrowed matches`);

  const matchingResults = await associateKardMatches(narrowedMatches, merchants);
  console.log(`Associated ${matchingResults?.matches?.length || 0} matches`);
  console.log('Finished associating matches');

  // update the incoming merchants request
  await Promise.all(incomingMerchants.map(async (incomingMerchant) => {
    try {
      const matchedAllMerchantNames = incomingMerchant?.names?.every((name) => matchingResults?.matches?.find((m) => m.name === name.merchant));
      if (incomingMerchant) {
        incomingMerchant.processed = matchedAllMerchantNames;
        incomingMerchant.dateProcessed = getUtcDate().toDate();
        incomingMerchant.lastModified = getUtcDate().toDate();
        await incomingMerchant.save();
      }
    } catch (e) {
      console.log(`Error updating incoming merchant: ${e}`);
    }
  }));

  // update the merchants with the karma collective member flag
  await updateKarmaCollectiveStatus(matchingResults?.matches);

  // Run these on the matched merchants
  console.log('Updating merchants and merchant rates');
  await updateKardMerchants(merchants);
  await updateKardMerchantRates(merchants);
};

export const onComplete = () => {
  console.log(`${JobNames.UpdateKardData} finished`);
};

export const onFailed = (_: SandboxedJob, err: Error) => {
  console.log(`${JobNames.UpdateKardData} failed`);
  console.log(err);
};

export const exec = async (data: IJobData) => {
  switch (data?.syncType) {
    case KardSyncType.UpdateMerchantsAndMerchantRates:
      await updateMerchantsAndMerchantRates();
      break;
    case KardSyncType.UpdateMerchants:
      await updateKardMerchantsJob();
      break;
    case KardSyncType.UpdateMerchantRates:
      await updateKardMerchantRatesJob();
      break;
    case KardSyncType.MatchKarmaCollectiveMerchants:
      await matchKarmaCollectiveMerchants();
      break;
    default:
      throw new Error('Invalid sync type');
  }

  console.log('[+] Kard data updated');
};
