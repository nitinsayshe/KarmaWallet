import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { MongoClient } from '../../../clients/mongo';
import { cleanUpDocuments } from '../../../lib/testingUtils';
import { createCompaniesFromKardMerchants } from '../create_test_data';

describe.skip('tests create companies from kard data logic', () => {
  afterEach(() => {
  });

  beforeEach(() => {});

  afterAll(async () => {
    MongoClient.disconnect();
  });

  beforeAll(async () => {
    await MongoClient.init();
  });

  it('createCompaniesFromKardMerchants creates companies for the pulled merchants', async () => {
    const companies = await createCompaniesFromKardMerchants();
    expect(companies).toBeDefined();
    expect(companies).not.toBeNull();

    // clean up
    await cleanUpDocuments(companies);
  });
});
