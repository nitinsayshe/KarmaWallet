import fs from 'fs';
import path from 'path';
import { afterAll, afterEach, beforeAll, describe, expect, it } from '@jest/globals';
import { randomUUID } from 'crypto';
import dayjs from 'dayjs';

import { MongoClient } from '../../../clients/mongo';
import { CardStatus } from '../../../lib/constants';
import { getUtcDate } from '../../../lib/date';
import {
  createSomeCards,
  createSomeCompanies,
  createSomeSectors,
  createSomeUsers,
} from '../../../lib/testingUtils';
import { ICardDocument } from '../../../models/card';
import { ICompanyDocument } from '../../../models/company';
import { IUserDocument, UserEmailStatus } from '../../../models/user';
import { IMarqetaUserState } from '../../../services/karmaCard/utils';
import { IMarqetaKycState } from '../types';
import { TransactionModel } from '../../../clients/marqeta/types';
import { ISectorDocument } from '../../../models/sector';
import { cleanUpDocuments } from '../../../lib/model';
import { mapMarqetaTransactionsToKarmaTransactions } from '../transactions';
import { MarqetaCardFulfillmentStatus, MarqetaCardState } from '../../../lib/constants/card';

// Thest values should match up with the request in ./data/testMarqetaTransaction.json
const mccToMatch = 9999;
const testTransactionAmount = 10;
const testMarqetaUsertoken = 'e4f8d09d-e218-43cf-b590-0a4075d60828';
const testMarqetaCardtoken = '7f6d13ba-e3b2-4627-b1ae-3f823d6820dc';

describe('tests marqeta integration transaction logic', () => {
  let testUserWithMarqetaIntegration: IUserDocument;
  let testCardWithMarqetaIntegration: ICardDocument;
  let testCompanyToMatchByName: ICompanyDocument;
  let testCompanyToMatchByMCC: ICompanyDocument;
  let testSector: ISectorDocument;

  afterEach(() => {
    /* clean up between tests */
  });

  afterAll(async () => {
    // clean up db
    await cleanUpDocuments([
      testUserWithMarqetaIntegration,
      testCompanyToMatchByName,
      testCompanyToMatchByMCC,
      testCardWithMarqetaIntegration,
      testSector,
    ]);

    MongoClient.disconnect();
  });

  beforeAll(async () => {
    await MongoClient.init();
    // add an existing cimmission with the kard integration to test case where we alreadyhave a commission with the same transaction id
    // expects a merchant to exist that has a kard integration

    [testSector] = await createSomeSectors({
      sectors: [{ name: 'Marqeta Test Sector' }],
    });
    [testCompanyToMatchByName, testCompanyToMatchByMCC] = await createSomeCompanies({
      companies: [
        { companyName: 'Marqeta Test Company', sectors: [{ primary: true, sector: testSector }] },
        { mcc: mccToMatch, sectors: [{ primary: true, sector: testSector }] },
      ],
    });

    [testUserWithMarqetaIntegration] = await createSomeUsers({
      users: [
        {
          name: 'testUserWithMarqetaIntegration User',
          emails: [
            {
              email: 'testUserWithMarqetaIntegration@testEmail.com',
              primary: true,
              status: UserEmailStatus.Verified,
            },
          ],
          integrations: {
            marqeta: {
              userToken: testMarqetaUsertoken,
              email: 'testUserWithMarqetaIntegration@testEmail.com',
              kycResult: {
                status: IMarqetaKycState.success,
                codes: ['success'],
              },
              first_name: 'testUserWithMarqetaIntegration',
              last_name: 'testUserWithMarqetaIntegration',
              birth_date: '1990-01-01',
              address1: '123 sw test st',
              city: 'test city',
              state: 'FL',
              country: 'USA',
              postal_code: '12345',
              account_holder_group_token: randomUUID().toString(),
              identifications: [],
              status: IMarqetaUserState.active,
              created_time: getUtcDate().toDate().toString(),
            },
          },
        },
      ],
    });
    [testCardWithMarqetaIntegration] = await createSomeCards({
      cards: [
        {
          userId: testUserWithMarqetaIntegration._id,
          status: CardStatus.Linked,
          integrations: {
            marqeta: {
              user_token: testMarqetaUsertoken,
              expiration_time: dayjs(getUtcDate().toDate()).add(1, 'year').toDate(),
              card_token: testMarqetaCardtoken,
              card_product_token: 'card_product_token',
              fulfillment_status: MarqetaCardFulfillmentStatus.DIGITALLY_PRESENTED,
              pan: '4111111111111111',
              last_four: '1111',
              expr_month: 1,
              expr_year: 2029,
              created_time: getUtcDate().toDate(),
              state: MarqetaCardState.ACTIVE,
              pin_is_set: true,
              instrument_type: 'VIRTUAL_PAN',
              barcode: 'barcode',
            },
          },
        },
      ],
    });
  });

  it('mapMarqetaTransactionsToKarmaTransactions processes a valid marqeta transaction successfully', async () => {
    const testTransactions: TransactionModel[] = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, './data/testMarqetaTransaction.json'), 'utf8'),
    );
    const karmaTransactions = await mapMarqetaTransactionsToKarmaTransactions(testTransactions, false);
    expect(karmaTransactions).toBeDefined();
    expect(karmaTransactions).not.toBeNull();
    expect(karmaTransactions.length).toBe(2);
    testTransactions.forEach((t) => {
      expect(t.user_token).toBe(testUserWithMarqetaIntegration.integrations.marqeta.userToken);
      expect(t.card_token).toBe(testCardWithMarqetaIntegration.integrations.marqeta.card_token);
      expect(t.amount).toBe(testTransactionAmount);
    });
  });
});
