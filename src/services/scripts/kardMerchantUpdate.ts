import fs from 'fs';
import Fuse from 'fuse.js';
import { Types } from 'mongoose';
import path from 'path';
import { KardClient } from '../../clients/kard';
import {
  Offer,
  Merchant,
  CommissionType,
  OfferType,
} from '../../clients/kard/types';
import { CompanyModel, ICompanyDocument } from '../../models/company';
import { IKardMerchantIntegration, IMerchantDocument, MerchantModel } from '../../models/merchant';
import { IMerchantRateDocument, MerchantRateModel } from '../../models/merchantRate';

export const DefaultMatchScoreThreshold = 0.0000001;
export const RestrictiveMatchScoreThreshold = 0.000000001;

export type Domain = {
  ID: string;
  Domain: string;
  Merchant: {
    ID: string;
    Name: string;
    MaxRate: {
      Kind: string;
      Amount: number;
      ref?: Offer;
    };
  };
};

export type SearchMatch<ResultType, MerchantIndexType, SearchItemIndexType> = {
  _id: SearchItemIndexType;
  companyName: string;
  url: string;
  topDomainMatchScore: number;
  topDomainMatchDomain: string;
  topDomainMatchMerchantName: string;
  topDomainMatchMerchantId: MerchantIndexType;
  topDomainMatches: Fuse.FuseResult<ResultType>[];
  topMerchantMatchScore: number;
  topMerchantMatchDomain: string;
  topMerchantMatchMerchantName: string;
  topMerchantMatchMerchantId: MerchantIndexType;
  topMerchantMatches: Fuse.FuseResult<ResultType>[];
};

export type KWMatch = {
  _id: Types.ObjectId;
  name: string;
  url: string;
  merchantId: string;
  candidateUrl: string;
  candidateName: string;
  searchItemId: string;
  score: number;
};

type MatchError = {
  company: ICompanyDocument;
  message: any;
};

type InitialMatch = Partial<SearchMatch<Domain, string, Types.ObjectId>>;

export type IntialMatchResults = {
  matches: InitialMatch[];
  errors: MatchError[];
};

export type NarrowDownMatchesConfig = {
  inputMatches?: IntialMatchResults['matches'];
  minMatchScore?: number;
  inputFilePath?: string;
  outputFilePath?: string;
};

const getMerchantDictionary = (merchants: Merchant[]) => merchants.reduce((acc: { [key: string]: Merchant }, merchant: Merchant) => {
  acc[merchant._id] = merchant;
  return acc;
}, {});

const getOfferDictionary = (offers: Offer[]) => offers.reduce((acc: { [key: string]: Offer[] }, offer: Offer) => {
  if (!acc[offer.merchantId]) acc[offer.merchantId] = [];
  acc[offer.merchantId].push(offer);
  return acc;
}, {});

// Creates a new merchant in the database
const createKardMerchant = async (merchant: Merchant, offers: Offer[]): Promise<IMerchantDocument | null> => {
  if (!merchant || !offers?.length) return null;
  try {
    const id = merchant._id;
    delete merchant._id;

    // add max rate
    const maxOffer = offers?.reduce(
      (acc, curr) => {
        if (curr.totalCommission > acc.totalCommission) return curr;
        return acc;
      },
      { totalCommission: 0 } as Offer,
    );
    const kardMerchant: IKardMerchantIntegration = {
      id,
      ...merchant,
      maxOffer,
    };
    const merchantInstance = new MerchantModel({
      name: merchant.name,
      mobileCompliant: true,
      integrations: {
        kard: kardMerchant,
      },
    });
    return merchantInstance.save();
  } catch (err) {
    console.error(err);
    return null;
  }
};

// Adds merchant rates to the merchant in the database
const createKardMerchantRates = async (kwMerchant: IMerchantDocument, offers: Offer[]): Promise<IMerchantRateDocument[] | null> => {
  if (!kwMerchant) return null;
  try {
    const merchantRates = await Promise.all(
      offers.map(async (offer) => {
        const id = offer._id;
        delete offer._id;
        const merchantRateInstance = new MerchantRateModel({
          merchant: kwMerchant._id,
          integrations: {
            kard: {
              id,
              ...offer,
            },
          },
        });
        return merchantRateInstance.save();
      }),
    );
    return merchantRates;
  } catch (err) {
    console.error(err);
    return null;
  }
};

const getKardOfferData = async (merchants?: Merchant[]): Promise<{
  merchants: Merchant[];
  offers: Offer[];
  domains: Domain[];
} | null> => {
  try {
    const kc = new KardClient();
    const kardMerchants = merchants || await kc.getRewardsMerchants();

    if (!kardMerchants) return null;

    const domains: Domain[] = kardMerchants.map((merchant) => {
      const maxRate = merchant.offers
        .filter((offer) => offer.offerType === OfferType.ONLINE && offer.commissionType === CommissionType.PERCENT)
        .reduce((acc, offer) => {
          const rate = offer.totalCommission;
          if (rate > acc) return rate;
          return acc;
        }, 0);
      return {
        ID: merchant._id,
        Domain: merchant.websiteURL.replace(/^https?:\/\//, ''),
        Merchant: {
          ID: merchant._id,
          Name: merchant.name,
          MaxRate: {
            Kind: CommissionType.PERCENT,
            Amount: maxRate,
          },
        },
      };
    });

    const offers = kardMerchants.map((merchant) => merchant.offers).flat();

    return { merchants: kardMerchants, offers, domains };
  } catch (err) {
    console.error(err);
    return null;
  }
};

// pulls the most recent merchants, domains, and rates from the kard API and saves to file locally
export const fetchMerchantOffersAndSaveToJSON = async () => {
  const { merchants, offers, domains } = await getKardOfferData();
  if (!merchants || !offers || !domains) {
    console.error('Failed to fetch data from Kard API');
    return;
  }
  fs.writeFileSync(
    path.resolve(__dirname, './.tmp', 'kard_merchants.json'),
    JSON.stringify(
      merchants.map((merchant) => {
        delete merchant.offers;
        return merchant;
      }),
    ),
  );
  fs.writeFileSync(path.resolve(__dirname, './.tmp', 'kard_domains.json'), JSON.stringify(domains));
  fs.writeFileSync(path.resolve(__dirname, './.tmp', 'kard_rates.json'), JSON.stringify(offers));
};

const getMatchFromDomainFuseResult = (
  merchantSearchResults: Fuse.FuseResult<Domain>[],
  domainSearchResults: Fuse.FuseResult<Domain>[],
  match: Partial<SearchMatch<Domain, string, Types.ObjectId>>,
): Partial<SearchMatch<Domain, string, Types.ObjectId>> => {
  const topDomainMatches = domainSearchResults?.slice(0, 3);
  const topMerchantMatches = merchantSearchResults?.slice(0, 3);

  const topDomainMatch: Fuse.FuseResult<Domain> = topDomainMatches?.[0];
  const topMerchantMatch: Fuse.FuseResult<Domain> = topMerchantMatches?.[0];

  if (!!topDomainMatches?.length) {
    match = {
      ...match,
      topDomainMatchScore: topDomainMatch?.score,
      topDomainMatchDomain: topDomainMatch?.item?.Domain,
      topDomainMatchMerchantName: topDomainMatch?.item?.Merchant?.Name,
      topDomainMatchMerchantId: topDomainMatch?.item?.ID,
      topDomainMatches,
    };
  }
  if (!!topMerchantMatches?.length) {
    match = {
      ...match,
      topMerchantMatchScore: topMerchantMatch?.score,
      topMerchantMatchDomain: topMerchantMatch?.item?.Domain,
      topMerchantMatchMerchantName: topMerchantMatch?.item?.Merchant?.Name,
      topMerchantMatchMerchantId: topMerchantMatch?.item?.ID,
      topMerchantMatches,
    };
  }
  return match;
};

const addKardIntegrationToMerchant = async (merchantId: Types.ObjectId, kardMerchant: Merchant): Promise<IMerchantDocument | null> => {
  try {
    const existingMerchant = await MerchantModel.findById(merchantId);
    if (!existingMerchant) {
      const missingMerchantError = `[err] merchant not found: ${merchantId}`;
      console.log(missingMerchantError);
      return null;
    }

    // update merchant to have kard integration
    if (!existingMerchant?.integrations) existingMerchant.integrations = {};
    existingMerchant.mobileCompliant = true;
    const integrationMerchant = { id: kardMerchant._id, ...kardMerchant };
    delete integrationMerchant._id;

    existingMerchant.integrations.kard = integrationMerchant;

    return existingMerchant.save();
  } catch (err) {
    console.error(err);
    return null;
  }
};

export type AssociatedMatchResult = {
  matches: {
    _id: Types.ObjectId;
    name: string;
    merchantId: string;
  }[],
  errors: string[]
};

// Add merchants to our database based on a csv of matches
export const associateKardMatches = async (merchantData?: KWMatch[], merchantsToMatch?: Merchant[]): Promise<AssociatedMatchResult> => {
  // update to name of file that you are using, should have _id, and merchantId where _id is the Company id and merchantId is the kard merchant id
  const matchesRaw = fs.readFileSync(path.resolve(__dirname, './.tmp', 'kard_matches_confirmed.json'), 'utf8');
  const matches: { _id: Types.ObjectId; merchantId: string, name: string }[] = merchantData?.length > 0 ? merchantData : JSON.parse(matchesRaw);

  const { merchants, offers, domains } = await getKardOfferData(merchantsToMatch);
  if (!merchants || !offers || !domains) {
    console.error('Error fetching data from Kard API');
    return;
  }

  const merchantDictionary = getMerchantDictionary(merchants); // specify get dictionary fucntion to work for domains
  const offerDictionary = getOfferDictionary(offers); // specify get dictionary fucntion to work for domains

  console.log(`[info] ${matches.length} matches found`);
  console.log(`[info] ${offers.length} rates found`);
  console.log(`[info] ${merchants.length} merchants found`);
  console.log(`[info] ${domains.length} domains found`);
  console.log('[info] starting process of creating merchants, merchant-rates, and associating matches with companies \n');

  const errors = (
    await Promise.all(
      matches.map(async (match) => {
        const { _id: companyId } = match;
        const { merchantId } = match;

        if (!companyId || !merchantId) {
          const missingDataError = `[err] match is missing info: company - ${companyId};  merchant - ${merchantId}`;
          console.log(missingDataError);
          return missingDataError;
        }

        const company = await CompanyModel.findById(companyId);

        if (!company) {
          const missingCompanyError = `[err] company not found: ${companyId}`;
          console.log(missingCompanyError);
          return missingCompanyError;
        }

        const merchant = merchantDictionary[merchantId];
        const domain = merchant?.websiteURL?.replace(/^https?:\/\//, '');
        const merchantOffers = offerDictionary[merchantId];

        try {
          if (!!company.merchant) {
            console.log(`[info] ${company.companyName} already has a merchant associated with it`);
            const updatedMerchant = await addKardIntegrationToMerchant(company.merchant as unknown as Types.ObjectId, merchant);
            if (!updatedMerchant) {
              throw new Error(`Error updating Merchant: ${merchant._id}`);
            }
            // update merchant rates
            const updatedRates = await createKardMerchantRates(updatedMerchant, merchantOffers);
            if (!updatedRates) {
              throw new Error(`Error updating Merchant Rates: ${merchant._id}`);
            }
            return;
          }

          const newMerchant = await createKardMerchant(merchant, merchantOffers);
          if (!newMerchant?._id) {
            throw new Error(`Error creating Merchant: ${merchant._id}`);
          }
          console.log(`created new merchant: ${newMerchant._id}`);
          const rates = await createKardMerchantRates(newMerchant, merchantOffers);
          if (!rates) {
            throw new Error(`Error creating Merchant Rates: ${merchant._id}`);
          }
          company.merchant = newMerchant._id;
          await company.save();
        } catch (err: any) {
          console.log(`[err] ${company.companyName} - ${merchant?._id} - ${domain} - ${merchantOffers?.length}`);
          return JSON.stringify({ companyId, merchantId, error: err.message });
        }

        return '';
      }),
    )
  ).filter((error) => !!error);
  if (errors?.length > 0) {
    fs.writeFileSync(path.resolve(__dirname, './.tmp', 'kardAssociationErrors.json'), JSON.stringify(errors));
  }
  if (matches?.length > 0) {
    fs.writeFileSync(path.resolve(__dirname, './.tmp/kard_associated_matches.json'), JSON.stringify(matches));
  }
  return { matches, errors };
};

// Removes any duplicate merchants from the database
// keeps merchants if they have other integrations
export const removeDuplicateKardMerchants = async () => {
  const merchants = await MerchantModel.find({});

  for (const merchant of merchants) {
    const { id } = merchant.integrations.kard;
    const duplicateMerchants = await MerchantModel.find({
      'integrations.kard.id': id,
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

// Updates existing merchants in database to ensure there are currently active domains
export const updateKardMerchants = async (merchants: Merchant[]): Promise<IMerchantDocument[]> => {
  if (!merchants) {
    console.error('No merchants provided');
    return;
  }

  const newActiveDomains: Domain[] = merchants.map((merchant) => {
    const maxRate = merchant.offers.reduce(
      (acc, offer) => {
        if (offer.totalCommission > acc.totalCommission) return offer;
        return acc;
      },
      { totalCommission: 0 } as Offer,
    );
    return {
      ID: merchant._id,
      Domain: merchant.websiteURL,
      Merchant: {
        ID: merchant._id,
        Name: merchant.name,
        MaxRate: {
          Kind: maxRate?.commissionType,
          Amount: maxRate?.totalCommission,
          ref: maxRate,
        },
      },
    };
  });

  const lastModifiedDate = new Date();
  if (!newActiveDomains) {
    console.log('[-] no new active domains found');
    return;
  }

  const updatedMerchants = (
    await Promise.all(
      newActiveDomains.map(async (domain) => {
        console.log('Updating Domain: ', domain.Domain);
        const existingMerchant = await MerchantModel.findOne({
          'integrations.kard.id': domain.Merchant.ID,
        });

        if (!!existingMerchant && !!existingMerchant.integrations.kard) {
          existingMerchant.integrations.kard.websiteURL = domain.Domain;
          existingMerchant.integrations.kard.maxOffer = domain.Merchant.MaxRate.ref;
          existingMerchant.lastModified = lastModifiedDate;
          existingMerchant.mobileCompliant = true;
          await existingMerchant.save();

          console.log('[+] updated existing merchant domain for ', existingMerchant.name);
          return existingMerchant;
        }
        return null;
      }),
    )
  ).filter((merchant) => !!merchant);

  console.log(`[+] updated ${updatedMerchants.length} merchants`);
  const merchantsWithoutActiveDomains = await MerchantModel.updateMany(
    { lastModified: { $ne: lastModifiedDate } },
    { 'integrations.kard.websiteURL': undefined },
  );
  console.log(`[-] ${merchantsWithoutActiveDomains?.modifiedCount} merchant website removed`);

  return updatedMerchants;
};

export const updateKardMerchantRates = async (kardMerchants: Merchant[]): Promise<IMerchantRateDocument[]> => {
  if (!kardMerchants) {
    console.error('no merchants provided');
    return;
  }
  const newOffers = kardMerchants?.map((merchant) => merchant.offers).flat();
  if (!newOffers) {
    console.error('[-] no new offers found');
    return;
  }

  const merchants: IMerchantDocument[] = await MerchantModel.find({});
  // caching date for cleanup purposes
  const lastModifiedDate = new Date().toISOString();
  const updateTimeBuffer = 1000 * 60 * 30; // 30 minutes
  const lastModifiedThreshold = new Date(new Date().getTime() - updateTimeBuffer).toISOString();
  const createdRates: IMerchantRateDocument[] = [];

  await Promise.all(
    merchants.map(async (merchant) => {
      if (!merchant?.integrations?.kard) return null;
      const { id } = merchant.integrations.kard;
      const newOffersForMerchant = newOffers.filter((offer) => offer.merchantId === id);

      if (newOffersForMerchant) {
        try {
          const newRates = (
            await Promise.all(
              newOffersForMerchant.map(async (offer) => {
                const o: Offer & { id: string } = { ...offer, id: offer._id };
                delete o._id;

                const merchantRate = await MerchantRateModel.create({
                  merchant: merchant._id,
                  integrations: {
                    kard: {
                      ...o,
                    },
                  },
                  lastModified: lastModifiedDate,
                });

                if (!merchantRate) return null;
                return merchantRate;
              }),
            )
          )?.filter((r) => !!r);
          createdRates.push(...newRates);
        } catch (err: any) {
          await MerchantRateModel.deleteMany({
            'integrations.kard.merchantId': id,
            lastModified: lastModifiedDate,
          });
          console.log('Error updating merchant rates for merchant', id, err);
          return;
        }
      }

      // after the newMerchantsRate loop, delete all the merchantRates last modified before the current date
      await MerchantRateModel.deleteMany({
        'integrations.kard.merchantId': id,
        lastModified: { $lt: lastModifiedThreshold },
      });
    }),
  );

  console.log(`[+] ${createdRates?.length} Rates Upserted`);
  return createdRates;
};

// Match kard companies to companies in the Karma Wallet database, creates a json with the matches, be sure to run pullRecentFromDatabaseAndSave first so we have the most up to date domain info
export const matchKardCompanies = async (merchants?: Merchant[]): Promise<IntialMatchResults> => {
  // get domains from kard
  const { domains } = await getKardOfferData(merchants);
  if (!domains) {
    console.error('Error fetching data from Kard API');
    return;
  }

  const fuse = new Fuse(domains, {
    includeScore: true,
    keys: ['Domain', 'Merchant.Name'],
    shouldSort: true,
  });
  const companies: ICompanyDocument[] = await CompanyModel.find({});
  const matches: Partial<SearchMatch<Domain, string, Types.ObjectId>>[] = [];

  const errors = (
    await Promise.all(
      companies.map(async (company) => {
        if (!!company.hidden?.status) {
          /* console.log(`[+] Skipping company, company is hidden - ${company.companyName}`); */
          return null;
        }

        if (!!company.merchant) {
          const merchant = await MerchantModel.findById(company.merchant);
          if (!!merchant?.integrations?.kard) {
            /* console.log(`[+] Skipping company, already has a kardmerchant - ${company.companyName}`); */
            return null;
          }
        }
        try {
          const cleanUrl = company.url?.replace(/^https?:\/\//, '');
          let domainMatch: Fuse.FuseResult<Domain>[] = [];
          if (!!cleanUrl) domainMatch = fuse.search(cleanUrl);
          let merchantMatch: Fuse.FuseResult<Domain>[] = [];
          if (!!company?.companyName) {
            merchantMatch = fuse.search(company.companyName);
          }

          if (!domainMatch?.length && !merchantMatch?.length) {
            return;
          }

          const matchObj: Partial<SearchMatch<Domain, string, Types.ObjectId>> = {
            _id: company._id as unknown as Types.ObjectId,
            companyName: company.companyName,
            url: company.url,
          };
          const match = getMatchFromDomainFuseResult(merchantMatch, domainMatch, matchObj);
          matches.push(match);
        } catch (err: any) {
          return { company, message: err?.message };
        }
      }),
    )
  ).filter((e) => !!e);

  console.log(`[+] ${matches?.length} matches found for ${domains?.length} domains`);
  console.log(`[-] ${errors?.length} errors found`);

  if (errors?.length) {
    fs.writeFileSync(path.resolve(__dirname, './.tmp/kard_matches_errors.json'), JSON.stringify(errors));
  }
  if (matches?.length) {
    fs.writeFileSync(path.resolve(__dirname, './.tmp/kard_fuzzy_matches.json'), JSON.stringify(matches));
  }

  return { matches, errors };
};

// Once the above function has been run, we can manually review the matches and confirm them, this function will create a json with the confirmed matches
export const narrowDownMatchesByScore = async (config?: NarrowDownMatchesConfig): Promise<KWMatch[]> => {
  const { inputMatches, inputFilePath, outputFilePath, minMatchScore } = config;
  let searchResultsRaw = '';
  if (!inputFilePath) {
    searchResultsRaw = fs.readFileSync(path.resolve(__dirname, './.tmp/kard_fuzzy_matches.json'), 'utf8');
  } else {
    searchResultsRaw = fs.readFileSync(path.resolve(__dirname, inputFilePath), 'utf8');
  }

  const searchResults: SearchMatch<Domain, string, Types.ObjectId>[] = inputMatches?.length > 0 ? inputMatches : JSON.parse(searchResultsRaw);

  const matches: KWMatch[] = searchResults
    ?.map((searchResult: SearchMatch<Domain, string, Types.ObjectId>) => {
      const {
        _id,
        topMerchantMatchScore,
        topDomainMatchScore,
        companyName,
        url,
        topMerchantMatches,
        topDomainMatches,
        topMerchantMatchMerchantName,
        topMerchantMatchMerchantId,
        topMerchantMatchDomain,
        topDomainMatchMerchantName,
        topDomainMatchDomain,
        topDomainMatchMerchantId,
      } = searchResult;

      let merchantMatch = false;
      let domainMatch = false;
      const candidate = {
        name: '',
        url: '',
        companyId: '',
        merchantId: '',
      };

      let minScore = topMerchantMatchScore;
      const minimumScoreForMatching = minMatchScore || DefaultMatchScoreThreshold;
      if (!!topMerchantMatchScore && topMerchantMatchScore < minimumScoreForMatching) {
        merchantMatch = true;
        candidate.name = topMerchantMatchMerchantName;
        candidate.url = topMerchantMatchDomain;
        candidate.companyId = topMerchantMatches?.[0]?.item?.Merchant?.ID;
        candidate.merchantId = topMerchantMatchMerchantId;
      }
      if (!!topDomainMatchScore && topDomainMatchScore < minimumScoreForMatching) {
        domainMatch = true;
        minScore = topDomainMatchScore;
        candidate.name = topDomainMatchMerchantName;
        candidate.url = topDomainMatchDomain;
        candidate.companyId = topDomainMatches?.[0]?.item?.Merchant?.ID;
        candidate.merchantId = topDomainMatchMerchantId;
      }

      if (!!merchantMatch && !!domainMatch) {
        if (topMerchantMatchScore < topDomainMatchScore) {
          merchantMatch = true;
          minScore = topMerchantMatchScore;
          candidate.name = topMerchantMatchMerchantName;
          candidate.url = topMerchantMatchDomain;
          candidate.companyId = topMerchantMatches?.[0]?.item?.Merchant?.ID;
          candidate.merchantId = topMerchantMatchMerchantId;
        } else {
          domainMatch = true;
          minScore = topDomainMatchScore;
          candidate.name = topDomainMatchMerchantName;
          candidate.url = topDomainMatchDomain;
          candidate.companyId = topDomainMatches?.[0]?.item?.Merchant?.ID;
          candidate.merchantId = topDomainMatchMerchantId;
        }
      }

      if (merchantMatch || domainMatch) {
        const newMatch: KWMatch = {
          _id,
          merchantId: candidate.merchantId,
          name: companyName,
          url,
          candidateUrl: candidate.url,
          candidateName: candidate.name,
          searchItemId: candidate.companyId,
          score: minScore,
        };
        return newMatch;
      }

      return null;
    })
    .filter((e) => e !== null);

  if (!outputFilePath) {
    fs.writeFileSync(path.resolve(__dirname, './.tmp/kard_matches_confirmed.json'), JSON.stringify(matches));
  } else {
    fs.writeFileSync(path.resolve(__dirname, outputFilePath), JSON.stringify(matches));
  }
  console.log(`[#] ${matches?.length} matches`);
  return matches;
};
