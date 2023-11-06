import fs from 'fs';
import Fuse from 'fuse.js';
import { Types } from 'mongoose';
import path from 'path';
import { WildfireClient } from '../../clients/wildfire';
import { CompanyModel, ICompanyDocument } from '../../models/company';
import { IMerchantDocument, IWildfireMerchantIntegration, MerchantModel } from '../../models/merchant';
import { MerchantRateModel } from '../../models/merchantRate';

const getWildfireDictionary = (arr: any) => arr.reduce((acc: any, merchant: any) => {
  acc[merchant.ID] = merchant;
  return acc;
}, {});

const addWildfireIntegrationToMerchant = async (
  merchantId: Types.ObjectId,
  merchant: any,
  domain: any,
): Promise<IMerchantDocument | null> => {
  try {
    const existingMerchant = await MerchantModel.findById(merchantId);
    if (!existingMerchant) {
      const missingMerchantError = `[err] merchant not found: ${merchantId}`;
      console.log(missingMerchantError);
      return null;
    }

    // update merchant to have kard integration
    if (!existingMerchant?.integrations) existingMerchant.integrations = {};
    existingMerchant.integrations.wildfire = {
      merchantId: merchant.ID,
      Name: merchant.Name,
      Kind: merchant?.Kind,
      PaysNewCustomersOnly: merchant?.PaysNewCustomersOnly,
      ShareAndEarnDisabled: merchant?.ShareAndEarnDisabled,
      domains: [domain],
      Categories: merchant?.Categories,
    } as IWildfireMerchantIntegration;

    return existingMerchant.save();
  } catch (err) {
    console.error(err);
    return null;
  }
};

// Creates a new merchant in the database
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

// Adds merchant rates to the merchant in the database
export const createMerchantRates = async (merchant: any, merchantRates: any) => {
  const kwMerchant = await MerchantModel.findOne({ 'integrations.wildfire.merchantId': merchant.ID });
  const rates = [];

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
    rates.push((await merchantRateInstance.save()));
  }
  return rates;
};

// Add merchants to our database based on a csv of matches
export const associateWildfireMatches = async () => {
  const errors = [];
  // update to name of file that you are using, should have _id, domainId, and merchantId
  const matchesRaw = fs.readFileSync(path.resolve(__dirname, './.tmp', 'wildfireMatches.json'), 'utf8');
  const matches = JSON.parse(matchesRaw);
  const rawDomains = fs.readFileSync(path.resolve(__dirname, './.tmp', 'wfdomains.json'), 'utf8');
  const domains = JSON.parse(rawDomains);
  const rawRates = fs.readFileSync(path.resolve(__dirname, './.tmp', 'wfrates.json'), 'utf8');
  const rates = JSON.parse(rawRates);
  const rawMerchants = fs.readFileSync(path.resolve(__dirname, './.tmp', 'wfmerchants.json'), 'utf8');
  const merchants = JSON.parse(rawMerchants);
  const wildfireMerchantDictionary = getWildfireDictionary(merchants);
  const wildfireDomainDictionary = getWildfireDictionary(domains);

  console.log(`[info] ${matches.length} matches found`);
  console.log(`[info] ${rates.length} rates found`);
  console.log(`[info] ${merchants.length} merchants found`);
  console.log(`[info] ${domains.length} domains found`);
  console.log(
    '[info] starting process of creating merchants, merchant-rates, and associating matches with companies \n',
  );

  for (const match of matches) {
    const { _id: companyId, domainId } = match;
    let { merchantId } = match;

    if (!merchantId) {
      const currentDomain = domains.find((domain: any) => domain.ID.toString() === domainId.toString());
      merchantId = currentDomain.Merchant.ID;
    }

    if (!companyId || !domainId || !merchantId) {
      console.log(
        `[err] match is missing info: company - ${companyId}; domain - ${domainId}; merchant - ${merchantId}`,
      );
      errors.push(
        `[err] match is missing info: company - ${companyId}; domain - ${domainId}; merchant - ${merchantId}`,
      );
      continue;
    }

    const company = await CompanyModel.findById(companyId);

    if (!company) {
      console.log(`[err] company not found: ${companyId}`);
      errors.push(match);
      continue;
    }

    const merchant = wildfireMerchantDictionary[merchantId];
    const domain = wildfireDomainDictionary[domainId];
    const merchantRates = rates[merchantId];

    try {
      const domainMerchantMatch = merchant.ID === domain.Merchant.ID;
      if (!domainMerchantMatch) throw new Error(`domain merchant mismatch: ${domain.Merchant.ID} != ${merchant.ID}`);
      console.log(
        `[info] ${company.companyName} - ${merchant.ID} - ${domain.ID} - ${merchantRates.length} - ${domainMerchantMatch}`,
      );
      // TODO: check if the merchant exists. If so, add the wildfire integration instead of creating the merchant
      if (!!company.merchant) {
        const updatedMerchant = await addWildfireIntegrationToMerchant(
          company.merchant as unknown as Types.ObjectId,
          merchant,
          domain,
        );
        if (!updatedMerchant) throw new Error(`Error updating Merchant: ${merchant._id}`);
        // update merchant rates
        const updatedRates = await createMerchantRates(updatedMerchant, merchantRates);
        if (!updatedRates) throw new Error(`Error updating Merchant Rates: ${merchant._id}`);
      }
      await createMerchant(merchant, domain);
      await createMerchantRates(merchant, merchantRates);
      const kwMerchant = await MerchantModel.findOne({ 'integrations.wildfire.merchantId': merchant.ID });
      if (!kwMerchant) throw new Error(`Merchant ${merchant.ID} not found in DB`);
      company.merchant = kwMerchant._id;
      await company.save();
    } catch (err: any) {
      errors.push({ companyId, domainId, merchantId, error: err.message });
      console.log(`[err] ${company.companyName} - ${merchant?.ID} - ${domain?.ID} - ${merchantRates?.length}`);
    }
    if (errors.length > 0) {
      fs.writeFileSync(path.resolve(__dirname, './.tmp', 'wildfireAssociationErrors.json'), JSON.stringify(errors));
    }
  }
};

// Removes any duplicate merchants from the database
// keeps merchants if they have other integrations
export const removeDuplicateWildfireMerchants = async () => {
  const merchants = await MerchantModel.find({});

  for (const merchant of merchants) {
    const { merchantId } = merchant.integrations.wildfire;
    const duplicateMerchants = await MerchantModel.find({
      'integrations.wildfire.merchantId': merchantId,
    });

    const firstDup = duplicateMerchants?.[0];
    const trimmedList = (
      await Promise.all(
        duplicateMerchants?.slice(1)?.map(async (duplicateMerchant) => {
          if (!duplicateMerchant?.integrations?.wildfire && !duplicateMerchant.integrations?.karma) {
            return duplicateMerchant.remove();
          }
          return null;
        }),
      )
    ).filter((m) => !!m);
    if (trimmedList?.length > 0) {
      await firstDup?.remove();
    }
  }
};

// Removes a single merchant from the database
export const removeWildfireMerchant = async (merchantId: string) => {
  const merchant = await MerchantModel.findOne({ _id: merchantId });

  if (!merchant) throw new Error('Merchant not found');
  if (merchant.integrations.kard || merchant.integrations.karma) throw new Error(`[+] err: merchant has other integrations ${merchantId}`);
  await MerchantRateModel.deleteMany({ merchant: merchantId });
  await MerchantModel.deleteOne({ _id: merchant._id });
  await CompanyModel.findOneAndUpdate({ merchant: merchant._id }, { $unset: { merchant: '' } });
};

export const removeMultipleWildfireMerchants = async () => {
  const merchantsToRemove = fs.readFileSync(path.resolve(__dirname, './.tmp/merchants_to_remove.json'), 'utf8');
  const parsedMerchantsToRemove = JSON.parse(merchantsToRemove);

  for (const parsedMerchant of parsedMerchantsToRemove) {
    const merchantData = await MerchantModel.findOne({ _id: parsedMerchant._id });
    if (!merchantData) {
      console.log('[+] merchant not found', parsedMerchant._id);
      continue;
    }

    if (merchantData.integrations.kard || merchantData.integrations.karma) {
      console.log('[+] merchant has other integrations', parsedMerchant._id);
      continue;
    }

    await MerchantRateModel.deleteMany({ merchant: parsedMerchant._id });
    await MerchantModel.deleteOne({ _id: parsedMerchant._id });
    await CompanyModel.findOneAndUpdate({ merchant: parsedMerchant._id }, { $unset: { merchant: '' } });
    console.log('[+] removed merchant', parsedMerchant._id);
  }
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

// Updates existing merchants in database to ensure there are currently active domains
export const updateWildfireMerchants = async () => {
  const wildfireClient = new WildfireClient();
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
      console.log('[+] NEW: updated existing merchant domain for ', existingMerchant.name);
      count += 1;
    }
  }

  console.log(`[+] updated ${count} merchants`);
  // after the newDomains loop, delete all the wildfire merchantRates last modified before the current date (since once we just updated should have been updated on current date)
  const merchantsWithoutActiveDomains = await MerchantModel.updateMany(
    { lastModified: { $ne: lastModifiedDate }, 'integrations.wildfire': { $exists: true } },
    { 'integrations.wildfire.domains.0.Merchant.MaxRate': null },
  );

  console.log(`[-] ${merchantsWithoutActiveDomains?.modifiedCount} merchant max rates removed`);
};

export const updateWildfireMerchantRates = async () => {
  const wildfireClient = new WildfireClient();
  const merchants: IMerchantDocument[] = await MerchantModel.find({ 'integrations.wildfire': { $exists: true } });
  const res = await wildfireClient.getMerchantRates();
  const newRates: { [key: string]: { ID: number; Name: string; Kind: string; Amount: string; Currency?: string }[] } = res.data;
  // caching date for cleanup purposes
  const lastModifiedDate = new Date().toISOString();
  let count = 0;

  for (const merchant of merchants) {
    const { merchantId } = merchant.integrations.wildfire;
    if (!merchantId) continue;
    const newRatesForMerchant = newRates[merchantId?.toString()];

    if (newRatesForMerchant) {
      try {
        for (const rate of newRatesForMerchant) {
          const merchantRate = await MerchantRateModel.create({
            merchant: merchant._id,
            integrations: {
              wildfire: {
                merchantId,
                ID: rate.ID,
                Name: rate.Name,
                Kind: rate.Kind,
                Amount: parseFloat(rate.Amount),
                Currency: rate.Currency,
              },
            },
            lastModified: lastModifiedDate,
          });

          if (merchantRate) count += 1;
        }
      } catch (err: any) {
        await MerchantRateModel.deleteMany({
          'integrations.wildfire.merchantId': merchantId,
          lastModified: lastModifiedDate,
        });

        console.log('Error updating merchant rates for merchant', merchantId, err);
        return;
      }
      // iterate over newRatesForMerchant and upsert a new merchantRate in the merchantRates collection (create it if it does not exist, if it does exist update i)
    }

    // after the newMerchantsRate loop, delete all the merchantRates last modified before the current date
    await MerchantRateModel.deleteMany({
      'integrations.wildfire.merchantId': merchantId,
      lastModified: { $lt: lastModifiedDate },
    });
  }

  console.log(`[+] ${count} Rates Upserted`);
};

const options = {
  includeScore: true,
  // Search in `author` and in `tags` array
  keys: ['Domain', 'Merchant.Name'],
};

// FUSE.js is a JavaScript library for fuzzy searching
// https://fusejs.io/examples.html

// Match Wildfire companies to companies in the Karma Wallet database, creates a json with the matches, be sure to run getCurrentWildfireData first so we have the most up to date domain info
export const matchWildfireCompanies = async () => {
  const domainsRaw = fs.readFileSync(path.resolve(__dirname, './.tmp/wfdomains.json'), 'utf8');
  const domains = JSON.parse(domainsRaw);
  const fuse = new Fuse(domains, options);
  const companies: ICompanyDocument[] = await CompanyModel.find({});
  const matches: any[] = [];
  let errors = 0;
  const errorObjects = [];
  let count = 0;
  let index = 0;
  for (const company of companies) {
    if (!!company.merchant) {
      const merchant = await MerchantModel.findById(company.merchant);
      if (!!merchant?.integrations?.wildfire) {
        console.log(`[+] Skipping company, already has a wildfire merchant - ${company.companyName}`);
        continue;
      }
    }

    if (!!company.hidden.status) {
      console.log(`[+] Skipping company, company is hidden - ${company.companyName}`);
      continue;
    }

    try {
      index += 1;
      console.log(`\n[+] searching for ${company.url} - ${company.companyName}`);
      console.log(`[#] item ${index}/${companies.length}`);
      console.log(`[#] ${count} matches | ${errors} errors`);
      const cleanUrl = company.url.replace(/^https?:\/\//, '');
      const domainMatch = fuse.search(cleanUrl);
      const merchantMatch = fuse.search(company.companyName);
      const topDomainMatches = domainMatch.slice(0, 3);
      const topMerchantMatches = merchantMatch.slice(0, 3);
      const topDomainMatch: any = topDomainMatches[0];
      const topMerchantMatch: any = topMerchantMatches[0];

      console.log(`[+] top domain match: ${topDomainMatch.item.Domain}`);
      console.log(`[+] top merchant match: ${topMerchantMatch.item.Merchant.Name}`);

      let matchObj: any = {
        _id: company._id,
        companyName: company.companyName,
        url: company.url,
      };
      if (topDomainMatches.length) {
        matchObj = {
          ...matchObj,
          topDomainMatchScore: topDomainMatch.score,
          topDomainMatchDomain: topDomainMatch.item.Domain,
          topDomainMatchMerchant: topDomainMatch.item.Merchant.Name,
          topDomainMatchMerchantId: topDomainMatch.item.ID,
          topDomainMatches,
        };
      }
      if (topMerchantMatches.length) {
        matchObj = {
          ...matchObj,
          topMerchantMatchScore: topMerchantMatch.score,
          topMerchantMatchDomain: topMerchantMatch.item.Domain,
          topMerchantMatchMerchant: topMerchantMatch.item.Merchant.Name,
          topMerchantMatchMerchantId: topMerchantMatch.item.ID,
          topMerchantMatches,
        };
      }
      matches.push(matchObj);
      count += 1;
      if (count === 1) {
        const matchesText = JSON.stringify(matches);
        fs.writeFileSync(path.resolve(__dirname, './.tmp/wildfireFuzzyMatches.json'), matchesText);
      }
      if (count % 20 === 0) {
        const matchesText = JSON.stringify(matches);
        fs.writeFileSync(path.resolve(__dirname, './.tmp/wildfireFuzzyMatches.json'), matchesText);
      }
    } catch (err: any) {
      errors += 1;
      errorObjects.push({ company, message: err?.message });
      fs.writeFileSync(path.resolve(__dirname, './.tmp/wildfireMatchesErrors.json'), JSON.stringify(errorObjects));
      console.log(`[-] error matching ${company.url} - ${company.companyName}`);
    }
  }
};

// Once the above function has been run, we can manually review the matches and confirm them, this function will create a json with the confirmed matches
export const searchResultsProcessing = async () => {
  const searchResultsRaw = fs.readFileSync(path.resolve(__dirname, './.tmp/wildfireFuzzyMatches.json'), 'utf8');
  const searchResults = JSON.parse(searchResultsRaw);
  let totalDomainMatches = 0;
  const matches: any[] = [];

  for (const searchResult of searchResults) {
    const {
      _id,
      topMerchantMatchScore,
      topDomainMatchScore,
      companyName,
      url,
      topDomainMatchMerchant,
      topDomainMatchDomain,
      topDomainMatchMerchantId,
    } = searchResult;

    let merchantMatch = false;
    let domainMatch = false;
    if (topMerchantMatchScore < 0.02) {
      merchantMatch = true;
    }
    if (topDomainMatchScore < 0.03) {
      domainMatch = true;
    }
    if (merchantMatch || domainMatch) {
      totalDomainMatches += 1;
      matches.push({
        _id,
        kwName: companyName,
        kwUrl: url,
        wfUrl: topDomainMatchDomain,
        wfName: topDomainMatchMerchant,
        domainId: topDomainMatchMerchantId,
        merchantId: searchResult.topMerchantMatches[0].item.Merchant.ID,
        score: topDomainMatchScore,
      });
      console.log(`[+] top domain match: ${topDomainMatchDomain} - ${topDomainMatchMerchantId}`);
    }
  }

  fs.writeFileSync(path.resolve(__dirname, './.tmp/wildfire_matches_confirmed.json'), JSON.stringify(matches));

  console.log(`[#] ${totalDomainMatches} matches`);
};

// if for any reason we lose the merchantId or domainId data, we can use this scripts to query off of the merchantName. Still need to manually review the domains to choose the valid one since it will create an array of domains.
export const addDomainsToMerchantsFromMerchantName = async (useJsonData?: boolean) => {
  const merchantsMissingData = await MerchantModel.find({
    'integrations.wildfire.merchantId': null,
    'integrations.wildfire': { $exists: true },
  });

  let activeDomains;
  let activeMerchants;
  const noLongerMerchants = [];

  if (useJsonData) {
    const domainsRaw = fs.readFileSync(path.resolve(__dirname, './.tmp/wfdomains.json'), 'utf8');
    activeDomains = JSON.parse(domainsRaw);
  } else {
    const wildfireClient = new WildfireClient();
    const activeData = await wildfireClient.getActiveDomains();
    const merchantData = await wildfireClient.getMerchants();
    activeMerchants = merchantData.data;
    activeDomains = activeData.data;
  }

  console.log(`$[+] ${merchantsMissingData.length} merchants missing data`);

  for (const merchant of merchantsMissingData) {
    const { name } = merchant;
    console.log(`[+] Searching for matching domains for ${name}`);
    const domains = activeDomains.filter((d: any) => d.Merchant.Name === name);
    if (!!domains.length) {
      merchant.integrations.wildfire.merchantId = domains[0].Merchant.ID;
      merchant.integrations.wildfire.domains = domains;
      console.log(`[+] Adding domains for ${name}`);
      await merchant.save();
    } else {
      const matchingMerchant = activeMerchants.find((m: any) => m.Name === name);
      if (!!matchingMerchant) {
        console.log('////// found a matching merchant!!!');
      } else {
        noLongerMerchants.push({
          name: merchant.name,
          _id: merchant._id,
        });
      }
    }
  }

  fs.writeFileSync(path.resolve(__dirname, './.tmp/no-longer-a-merchant.json'), JSON.stringify(noLongerMerchants));
};

export const identifyMerchantsNoLongerOnWildfire = async () => {
  const noActiveMerchant = [];
  const wildfireClient = new WildfireClient();
  const wildfireMerchants = await wildfireClient.getMerchants();
  const merchants = await MerchantModel.find({ 'integrations.wildfire': { $exists: true } });

  for (const merchant of merchants) {
    const existingMerchant = wildfireMerchants.data.find((m: any) => m.ID === merchant.integrations.wildfire.merchantId);
    if (!existingMerchant) {
      console.log(`[+] ${merchant.name}`);
      noActiveMerchant.push({
        _id: merchant._id,
        name: merchant.name,
      });
    }
  }

  fs.writeFileSync(path.resolve(__dirname, './.tmp/no-longer-a-merchant-prod.json'), JSON.stringify(noActiveMerchant));
};
