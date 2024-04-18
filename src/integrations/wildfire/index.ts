import fs from 'fs';
import path from 'path';
import { WildfireClient } from '../../clients/wildfire';
import { MerchantModel } from '../../models/merchant';

// Gets the current Wildfire data for our mobile environment and saves locally, run before executing other functions
export const getCurrentMobileWildfireData = async () => {
  const wildfireClient = new WildfireClient();
  const merchants = await wildfireClient.getMobileMerchants();
  const domains = await wildfireClient.getMobileActiveDomains();
  const rates = await wildfireClient.getMerchantRates();

  fs.writeFileSync(path.resolve(__dirname, './.tmp', 'wfmobilemerchants.json'), JSON.stringify(merchants.data));
  fs.writeFileSync(path.resolve(__dirname, './.tmp', 'wfmobiledomains.json'), JSON.stringify(domains.data));
  fs.writeFileSync(path.resolve(__dirname, './.tmp', 'wfmobilerates.json'), JSON.stringify(rates.data));
};

// Gets the current Wildfire data and saves locally, run before executing other functions
export const getCurrentWildfireData = async () => {
  const wildfireClient = new WildfireClient();
  const merchants = await wildfireClient.getMerchants();
  const domains = await wildfireClient.getActiveDomains();
  const rates = await wildfireClient.getMerchantRates();

  fs.writeFileSync(path.resolve(__dirname, './.tmp', 'wfmerchants.json'), JSON.stringify(merchants.data));
  fs.writeFileSync(path.resolve(__dirname, './.tmp', 'wfdomains.json'), JSON.stringify(domains.data));
  fs.writeFileSync(path.resolve(__dirname, './.tmp', 'wfrates.json'), JSON.stringify(rates.data));
};

export const addMobileEnabledToMerchants = async () => {
  const mobileMerchants = JSON.parse(fs.readFileSync(path.resolve(__dirname, './.tmp', 'wfmobilemerchants.json')).toString());
  const mobileMerchantsArray = mobileMerchants.map((merchant: any) => merchant.ID);
  const existingMerchantsWithWildfireIntegration = await MerchantModel.find({ 'integrations.wildfire': { $exists: true } });

  for (const merchant of existingMerchantsWithWildfireIntegration) {
    const mobileCompliant = mobileMerchantsArray.includes(merchant.integrations.wildfire.merchantId);
    merchant.mobileCompliant = mobileCompliant;
    await merchant.save();
  }
};
