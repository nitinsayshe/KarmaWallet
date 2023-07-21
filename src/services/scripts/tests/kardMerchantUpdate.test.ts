import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { Types } from 'mongoose';
import { MongoClient } from '../../../clients/mongo';
import { cleanUpDocuments, createSomeCompanies, createSomeMerchants } from '../../../lib/testingUtils';
import { CompanyModel, ICompanyDocument } from '../../../models/company';
import { IMerchantDocument, MerchantModel } from '../../../models/merchant';
import {
  associateKardMatches,
  Domain,
  matchKardCompanies,
  narrowDownMatchesByScore,
  SearchMatch,
} from '../kardMerchantUpdate';

describe('tests kardMerchantUpdate logic', () => {
  let testCompanyNameMatchWithNoMerchant: ICompanyDocument;
  let testCompanyUrlMatchWithNoMerchant: ICompanyDocument;
  let testCompanyNameMatchWithMerchant: ICompanyDocument;
  let testCompanyUrlMatchWithMerchant: ICompanyDocument;
  let testMerchantWithWildfireIntegration: IMerchantDocument;
  let testUrlMatchMerchantWithWildfireIntegration: IMerchantDocument;

  afterEach(() => {
    /* clean up between tests */
  });

  beforeEach(() => {
    fs.rmSync(path.resolve(__dirname, '../.tmp/kard_matches_error.json'), { force: true });
    fs.rmSync(path.resolve(__dirname, '../.tmp/kard_fuzzy_matches.json'), { force: true });
    fs.rmSync(path.resolve(__dirname, '../.tmp/kard_matches_confirmed.json'), { force: true });
  });
  afterAll(async () => {
    // clean up db
    await cleanUpDocuments([
      testCompanyNameMatchWithNoMerchant,
      testCompanyUrlMatchWithNoMerchant,
      testCompanyNameMatchWithMerchant,
      testCompanyUrlMatchWithMerchant,
      testMerchantWithWildfireIntegration,
      testUrlMatchMerchantWithWildfireIntegration,
    ]);

    MongoClient.disconnect();
  });

  beforeAll(async () => {
    await MongoClient.init();

    // create merchant with wildfire integration
    [testMerchantWithWildfireIntegration, testUrlMatchMerchantWithWildfireIntegration] = await createSomeMerchants({
      merchants: [
        {
          name: 'Auto Evolution',
          integrations: {
            wildfire: {
              merchantId: 1234567890,
              Name: 'Auto Evolution',
              domains: [
                {
                  Domain: '',
                  ID: '1234567890',
                  Merchant: {
                    ID: 1234567890,
                    Name: 'Auto Evolution',
                    MaxRate: {
                      Kind: 'Percent',
                      Amount: 10,
                      Currency: 'USD',
                    },
                  },
                },
              ],
            },
          },
        },
        {
          name: 'Cool Smoked Food',
          integrations: {
            wildfire: {
              merchantId: 1234567891,
              Name: 'Cool Smoked Food',
              domains: [
                {
                  Domain: 'https://www.kardhilltopbbq.com',
                  ID: '1234567891',
                  Merchant: {
                    ID: 1234567891,
                    Name: 'Cool Smoked Food',
                    MaxRate: {
                      Kind: 'Percent',
                      Amount: 10,
                      Currency: 'USD',
                    },
                  },
                },
              ],
            },
          },
        },
      ],
    });

    // create companies
    [
      testCompanyNameMatchWithNoMerchant,
      testCompanyUrlMatchWithNoMerchant,
      testCompanyNameMatchWithMerchant,
      testCompanyUrlMatchWithMerchant,
    ] = await createSomeCompanies({
      companies: [
        {
          companyName: 'The Coat Store',
          /* url: 'https://www.kardcoats.com', */
        },
        {
          /* companyName: 'Kard Baas Pro Shops', */
          url: 'https://www.kardbaasproshops.com',
        },
        {
          companyName: testMerchantWithWildfireIntegration.name,
          merchant: testMerchantWithWildfireIntegration._id,
        },
        {
          companyName: testUrlMatchMerchantWithWildfireIntegration.name,
          url: 'https://www.kardhilltopbbq.com',
          merchant: testUrlMatchMerchantWithWildfireIntegration._id,
        },
      ],
    });
  });

  it.skip('matchKardCompanies creates json with fuzzy matches', async () => {
    await matchKardCompanies();

    const results: SearchMatch<Domain, string, Types.ObjectId>[] = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../.tmp/kard_fuzzy_matches.json'), 'utf8'),
    );

    expect(results).not.toBeNull();
    expect(results.length).toBeGreaterThanOrEqual(4);
  }, 50000);

  it.skip('narrowDownMatchesByScore filters out matches that scored beneath the threshold given domain search results', async () => {
    // fakes the fuzzy matches using kard sandbox merchant data and injects our test company ids
    let testMatches: SearchMatch<Domain, string, Types.ObjectId>[] = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, './data/test_kard_fuzzy_matches.json'), 'utf8'),
    );

    testMatches = testMatches.map((match) => {
      const company = [
        testCompanyNameMatchWithNoMerchant,
        testCompanyUrlMatchWithNoMerchant,
        testCompanyUrlMatchWithMerchant,
        testCompanyNameMatchWithMerchant,
      ].find((c) => c.companyName === match.companyName || c.url === match.url);
      match._id = (company?._id as unknown as Types.ObjectId) || match._id;
      match.companyName = company?.companyName || match.companyName;
      return match;
    });

    fs.writeFileSync(path.resolve(__dirname, '../.tmp/kard_fuzzy_matches.json'), JSON.stringify(testMatches));

    await narrowDownMatchesByScore();

    const results: SearchMatch<Domain, string, Types.ObjectId>[] = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../.tmp/kard_matches_confirmed.json'), 'utf8'),
    );
    expect(results).not.toBeNull();
    expect(results.length).toEqual(4);
  });

  it.skip('associateKardMatches creates new merchant on company if it does not exist and creates json report if it does', async () => {
    fs.writeFileSync(
      path.resolve(__dirname, '../.tmp/kard_matches_confirmed.json'),
      JSON.stringify([
        {
          _id: testCompanyNameMatchWithNoMerchant._id,
          kwName: testCompanyNameMatchWithNoMerchant.companyName,
          kwUrl: testCompanyNameMatchWithNoMerchant.url,
          merchantId: '63725ce23705650008353213', // kard sandbox merchant id for 'the coat store'
          score: 9.287439764962262e-10,
        },
        {
          _id: testCompanyUrlMatchWithNoMerchant._id,
          kwName: testCompanyUrlMatchWithNoMerchant.companyName,
          kwUrl: testCompanyUrlMatchWithNoMerchant.url,
          kardUrl: 'https://www.kardbaasproshops.com',
          merchantId: '6409f118705b8a000834f23d',
          score: 1.6269500349918416e-16,
        },
        {
          _id: testCompanyNameMatchWithMerchant._id,
          kwName: testCompanyNameMatchWithMerchant.companyName,
          merchantId: '629f6f34b5df7700096f8849',
          score: 1.6269500349918416e-16,
        },
        {
          _id: testCompanyUrlMatchWithMerchant._id,
          kwName: testCompanyUrlMatchWithMerchant.companyName,
          kwUrl: testCompanyUrlMatchWithMerchant.url,
          kardUrl: 'https://www.kardhilltopbbq.com',
          merchantId: '629f6fa4b5df7700096f884a',
          score: 1.6269500349918416e-16,
        },
      ]),
    );

    await associateKardMatches();
    // check that a  merchant object was created on the company
    const testUrlMatchCompany = await CompanyModel.findById(testCompanyUrlMatchWithNoMerchant._id);
    const testNameMatchCompany = await CompanyModel.findById(testCompanyNameMatchWithNoMerchant._id);
    await Promise.all(
      [testUrlMatchCompany, testNameMatchCompany].map(async (company) => {
        expect(company).not.toBeNull();
        expect(company?.merchant).not.toBeNull();
        // lookup and remove merchant
        try {
          const merchant = await MerchantModel.findById(company?.merchant);
          await merchant?.remove?.();
        } catch (err) {
          expect(err).toBeNull();
        }
        return company;
      }),
    );

    // check that the two merchants with wildfire integrations now also have a kard integration
    const updatedNameMatchMerchant = await MerchantModel.findById(testMerchantWithWildfireIntegration._id);
    expect(updatedNameMatchMerchant?.integrations?.kard).not.toBeNull();
    expect(updatedNameMatchMerchant?.integrations?.kard?.id).toEqual('629f6f34b5df7700096f8849');
    const updatedUrlMatchMerchant = await MerchantModel.findById(testUrlMatchMerchantWithWildfireIntegration._id);
    expect(updatedUrlMatchMerchant?.integrations?.kard).not.toBeNull();
    expect(updatedUrlMatchMerchant?.integrations?.kard?.id).toEqual('629f6fa4b5df7700096f884a');
  }, 10000);
});
