import { WildfireClient } from '../../clients/wildfire';
import { CompanyModel } from '../../models/company';
import { MerchantModel } from '../../models/merchant';
import { MerchantRateModel } from '../../models/merchantRate';

export const updateWildfireMerchants = async () => {
  const wildfireClient = new WildfireClient();
  // const merchants: IMerchantDocument[] = await MerchantModel.find({});
  const res = await wildfireClient.getActiveDomains();
  const newActiveDomains: any[] = res.data;
  const lastModifiedDate = new Date();
  let count = 0;
  // caching date for cleanup purposes
  if (!newActiveDomains) {
    console.log('[-] no new active domains found');
    return;
  }

  for (const domain of newActiveDomains) {
    const existingMerchant = await MerchantModel.findOneAndUpdate(
      {
        'integrations.wildfire.merchantId': domain.Merchant.ID,
        'integrations.wildfire.domains.0.ID': domain.ID,
      },
      {
        'integrations.wildfire.domains.0': domain,
        lastModified: lastModifiedDate,
      },
    );
    if (existingMerchant) {
      console.log('[+] updated existing merchant domain for ', existingMerchant.name);
      count += 1;
    }
  }
  console.log(`[+] updated ${count} merchants`);
  const merchantsWithoutActiveDomains = await MerchantModel.updateMany({ lastModified: { $ne: lastModifiedDate } }, { 'integrations.wildfire.domains.0.Merchant.MaxRate': null });
  console.log(`[-] ${merchantsWithoutActiveDomains?.modifiedCount} merchant max rates removed`);
};

export const removeDuplicateWildfireMerchants = async () => {
  const merchants = await MerchantModel.find({});

  for (const merchant of merchants) {
    const { merchantId } = merchant.integrations.wildfire;
    const duplicateMerchants = await MerchantModel.find({
      'integrations.wildfire.merchantId': merchantId,
    });
    if (duplicateMerchants.length > 1) {
      const duplicateMerchant = duplicateMerchants[1];
      await MerchantModel.deleteOne({ _id: duplicateMerchant._id });
    }
  }
};

// removes a single merchant from the database - will need to revisit this later
export const removeMerchant = async (merchantId: string) => {
  const merchant = await MerchantModel.findOne({ _id: merchantId });

  if (!merchant) {
    throw new Error('Merchant not found');
  }

  await MerchantRateModel.deleteMany({ merchant: merchantId });
  await MerchantModel.deleteOne({ _id: merchant._id });
  await CompanyModel.findOneAndUpdate({ merchant: merchant._id }, { $unset: { merchant: '' } });
};
