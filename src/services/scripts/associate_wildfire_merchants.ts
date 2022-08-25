import csv from 'csvtojson';
import fs from 'fs';
import path from 'path';
import { CompanyModel } from '../../models/company';
import { MerchantModel } from '../../models/merchant';
import { MerchantRateModel } from '../../models/merchantRate';

const getWildfireDictionary = (arr: any) => arr.reduce((acc: any, merchant: any) => {
  acc[merchant.ID] = merchant;
  return acc;
}, {});

export const createMerchant = async (merchant: any, domain: any) => {
  const merchantInstance = new MerchantModel({
    name: merchant.Name,
    integrations: {
      wildfire: {
        merchantId: merchant.ID,
        Name: merchant.Name,
        Kind: merchant?.Kind,
        PaysNewCustomersOnly: merchant?.PaysNewCustomersOnly,
        ShareAndEarnDisabled: merchant?.ShareAndEarnDisabled,
        domains: [domain],
        Categories: merchant?.Categories,
      },
    },
  });
  await merchantInstance.save();
};

export const createMerchantRates = async (merchant: any, merchantRates: any) => {
  const kwMerchant = await MerchantModel.findOne({ 'integrations.wildfire.merchantId': merchant.ID });
  if (!kwMerchant) throw new Error(`Merchant ${merchant.ID} not found in DB`);
  for (const rate of merchantRates) {
    const merchantRateInstance = new MerchantRateModel({
      merchant: kwMerchant._id,
      integrations: {
        wildfire: {
          merchantId: merchant.ID,
          ID: rate.ID,
          Name: rate?.Name,
          Kind: rate?.Kind,
          Amount: rate?.Amount,
          Currency: rate?.Currency,
        },
      },
    });
    await merchantRateInstance.save();
  }
};

export const associateWildfireMatches = async () => {
  const errors = [];
  const matches = await csv().fromFile(path.resolve(__dirname, './.tmp', 'wildfireMatches.csv'));
  const rawDomains = fs.readFileSync(path.resolve(__dirname, './.tmp', 'wfdomains.json'), 'utf8');
  const domains = JSON.parse(rawDomains);
  const rawRates = fs.readFileSync(path.resolve(__dirname, './.tmp', 'wfrates.json'), 'utf8');
  const rates = JSON.parse(rawRates);
  const rawMerchants = fs.readFileSync(path.resolve(__dirname, './.tmp', 'wfmerchants.json'), 'utf8');
  const merchants = JSON.parse(rawMerchants);
  const wildfireMerchantDictionary = getWildfireDictionary(merchants);
  const wildfireDomainDictionary = getWildfireDictionary(domains);
  console.log(matches.length, merchants.length, Object.keys(rates).length, domains.length);
  for (const match of matches) {
    const { _id: companyId, domainId, merchantId } = match;
    if (!companyId || !domainId || !merchantId) console.log(`[err] match is missing info: company - ${companyId}; domain - ${domainId}; merchant - ${merchantId}`);
    const company = await CompanyModel.findById(companyId);
    if (!company) console.log(`[err] company not found: ${companyId}`);
    const merchant = wildfireMerchantDictionary[merchantId];
    const domain = wildfireDomainDictionary[domainId];
    const merchantRates = rates[merchantId];
    try {
      const domainMerchantMatch = merchant.ID === domain.Merchant.ID;
      if (!domainMerchantMatch) throw new Error(`domain merchant mismatch: ${domain.Merchant.ID} != ${merchant.ID}`);
      console.log(`[info] ${company.companyName} - ${merchant.ID} - ${domain.ID} - ${merchantRates.length} - ${domainMerchantMatch}`);
      await createMerchant(merchant, domain);
      await createMerchantRates(merchant, merchantRates);
      const kwMerchant = await MerchantModel.findOne({ 'integrations.wildfire.merchantId': merchant.ID });
      if (!kwMerchant) throw new Error(`Merchant ${merchant.ID} not found in DB`);
      company.merchant = kwMerchant._id;
      await company.save();
    } catch (err:any) {
      errors.push({ companyId, domainId, merchantId, error: err.message });
      console.log(`[err] ${company.companyName} - ${merchant?.ID} - ${domain?.ID} - ${merchantRates?.length}`);
    }
    if (errors.length > 0) {
      fs.writeFileSync(path.resolve(__dirname, './.tmp', 'wildfireAssociationErrors.json'), JSON.stringify(errors));
    }
  }
};
