import { afterAll, afterEach, beforeAll, describe, expect, it } from '@jest/globals';
import { randomUUID } from 'crypto';
import { ObjectId, Types } from 'mongoose';
import { generateCommissionPayoutOverview } from '..';
import { MerchantSource, RewardStatus, RewardType } from '../../../clients/kard/types';
import { MongoClient } from '../../../clients/mongo';
import { IMarqetaKycState, IMarqetaUserStatus } from '../../../integrations/marqeta/user/types';
import { CardNetwork, CardStatus, KardEnrollmentStatus } from '../../../lib/constants';
import { getUtcDate } from '../../../lib/date';
import { cleanUpDocuments } from '../../../lib/model';
import { getRandomInt } from '../../../lib/number';
import {
  createSomeCards,
  createSomeCommissionPayouts,
  createSomeCommissions,
  createSomeCompanies,
  createSomeMerchants,
  createSomeUsers,
} from '../../../lib/testingUtils';
import { ICardDocument } from '../../../models/card';
import { ICommissionPayoutDocument, KarmaCommissionPayoutStatus } from '../../../models/commissionPayout';
import { ICommissionPayoutOverviewDocument } from '../../../models/commissionPayoutOverview';
import { ICommissionDocument, KarmaCommissionStatus, WildfireCommissionStatus } from '../../../models/commissions';
import { ICompanyDocument } from '../../../models/company';
import { IMerchantDocument } from '../../../models/merchant';
import { UserEmailStatus } from '../../../models/user/types';
import { IUserDocument } from '../../../models/user';
import { aggregateCommissionTotalAndIds } from '../utils';

describe('tests commission service logic', () => {
  let commissionsTotalForUserWithLinkedCard: number;
  let commissionIdsForUserWithLinkedCard: ObjectId[];
  let commissionsTotalForUserWithPaypalIntegration: number;
  let commissionIdsForUserWithPaypalIntegration: ObjectId[];
  let commissionsTotalForUserWithMarqetaIntegration: number;
  let commissionIdsForUserWithMarqetaIntegration: ObjectId[];
  let testUserWithLinkedCard: IUserDocument;
  let testUserWithPaypalIntegration: IUserDocument;
  let testUserWithMarqetaIntegration: IUserDocument;
  let testCardWithKardIntegration: ICardDocument;
  let testMerchantWithKardIntegration: IMerchantDocument;
  let testMerchantCompany: ICompanyDocument;
  let testCommissions: (ICommissionDocument & { user: IUserDocument })[];
  let testCommissionPayouts: ICommissionPayoutDocument[];

  afterEach(() => {
    /* clean up between tests */
  });

  afterAll(async () => {
    // clean up db
    await cleanUpDocuments([
      testUserWithLinkedCard,
      testUserWithPaypalIntegration,
      testUserWithMarqetaIntegration,
      testMerchantWithKardIntegration,
      testMerchantCompany,
      testCardWithKardIntegration,
      ...testCommissions,
      ...testCommissionPayouts,
    ]);

    MongoClient.disconnect();
  });

  beforeAll(async () => {
    await MongoClient.init();
    // make some pending commission payouts and associated commissions
    // they need wildfire, kard, and karma integrations as well as associated users.
    // Some with paypal and/or marqeta integrations.
    // some without
    [testMerchantWithKardIntegration] = await createSomeMerchants({
      merchants: [
        {
          name: 'testMerchantWithKardIntegration',
          integrations: {
            kard: {
              id: randomUUID().toString(),
              name: 'testMerchantWithKardIntegration',
              source: MerchantSource.NATIONAL,
              description: 'testMerchantWithKardIntegration',
              imgUrl: 'https://www.test.com',
              bannerImgUrl: 'https://www.test.com',
              websiteURL: 'https://www.test.com',
              acceptedCards: [CardNetwork.Visa],
              category: 'testMerchantWithKardIntegrationCategory',
              createdDate: getUtcDate().toDate().toString(),
              lastModified: getUtcDate().toDate().toString(),
            },
          },
        },
      ],
    });

    [testMerchantCompany] = await createSomeCompanies({ companies: [{ merchant: testMerchantWithKardIntegration }] });

    [testUserWithLinkedCard, testUserWithPaypalIntegration, testUserWithMarqetaIntegration] = await createSomeUsers({
      users: [
        {
          name: 'testUserWithKardIntegration User',
          emails: [
            {
              email: 'testUserWithLinkedAccount@testEmail.com',
              primary: true,
              status: UserEmailStatus.Verified,
            },
          ],
        },
        {
          name: 'testUserWithKardIntegration User',
          emails: [
            {
              email: 'testUserWithPaypalIntegration@testEmail.com',
              primary: true,
              status: UserEmailStatus.Verified,
            },
          ],
          integrations: {
            paypal: {
              user_id: randomUUID().toString(),
              sub: randomUUID().toString(),
              name: 'testUserWithPaypalIntegration',
              middle_name: 'testMiddleName',
              email: 'testUserWithPaypalIntegration@testEmail.com',
              verified: true,
              payerId: randomUUID().toString(),
              verified_account: true,
              email_verified: true,
            },
          },
        },
        {
          name: 'testUserWithKardIntegration User',
          emails: [
            {
              email: 'testUserWithMarqetaIntegration@testEmail.com',
              primary: true,
              status: UserEmailStatus.Verified,
            },
          ],
          integrations: {
            marqeta: {
              userToken: randomUUID().toString(),
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
              status: IMarqetaUserStatus.ACTIVE,
              created_time: getUtcDate().toDate().toString(),
            },
          },
        },
      ],
    });
    [testCardWithKardIntegration] = await createSomeCards({
      cards: [
        {
          userId: testUserWithLinkedCard._id,
          status: CardStatus.Linked,
          integrations: {
            kard: {
              userId: randomUUID(),
              createdOn: getUtcDate().toDate(),
              enrollmentStatus: KardEnrollmentStatus.Enrolled,
            },
          },
        },
      ],
    });

    const testWildfireIntegration = {
      wildfire: {
        CommissionID: getRandomInt(100000, 999999).toString(),
        ApplicationID: getRandomInt(100000, 999999).toString(),
        MerchantID: getRandomInt(100000, 999999).toString(),
        DeviceID: getRandomInt(100000, 999999).toString(),
        SaleAmount: {
          Amount: '1000',
          Currency: 'USD',
        },
        Amount: {
          Amount: '1000',
          Currency: 'USD',
        },
        Status: WildfireCommissionStatus.Paid,
        EventDate: getUtcDate().toDate(),
        CreatedDate: getUtcDate().toDate(),
        ModifiedDate: getUtcDate().toDate(),
        MerchantOrderID: getRandomInt(100000, 999999).toString(),
        MerchantSKU: getRandomInt(100000, 999999).toString(),
      },
    };
    const testKarmaIntegration = {
      karma: {
        amount: 1000,
        createdOn: getUtcDate().toDate(),
        promo: new Types.ObjectId(),
      },
    };

    const testKardIntegration = {
      kard: {
        reward: {
          merchantId: testMerchantWithKardIntegration.integrations.kard.id,
          name: testMerchantWithKardIntegration.integrations.kard.name,
          type: RewardType.CARDLINKED,
          status: RewardStatus.SETTLED,
          commissionToIssuer: 1000,
        },
      },
    };
    testCommissions = (await createSomeCommissions({
      commissions: [
        {
          user: testUserWithLinkedCard,
          merchant: testMerchantWithKardIntegration,
          company: testMerchantCompany,
          amount: 1000,
          integrations: testKarmaIntegration,
          status: KarmaCommissionStatus.PendingPaymentToUser,
        },
        {
          user: testUserWithLinkedCard,
          merchant: testMerchantWithKardIntegration,
          company: testMerchantCompany,
          amount: 1000,
          integrations: testKarmaIntegration,
          status: KarmaCommissionStatus.PendingPaymentToUser,
        },
        {
          user: testUserWithPaypalIntegration,
          merchant: testMerchantWithKardIntegration,
          company: testMerchantCompany,
          amount: 1000,
          integrations: testKardIntegration,
          status: KarmaCommissionStatus.PendingPaymentToUser,
        },
        {
          user: testUserWithPaypalIntegration,
          merchant: testMerchantWithKardIntegration,
          company: testMerchantCompany,
          amount: 1000,
          integrations: testKardIntegration,
          status: KarmaCommissionStatus.PendingPaymentToUser,
        },
        {
          user: testUserWithMarqetaIntegration,
          merchant: testMerchantWithKardIntegration,
          company: testMerchantCompany,
          amount: 1000,
          integrations: testWildfireIntegration,
          status: KarmaCommissionStatus.PendingPaymentToUser,
        },
        {
          user: testUserWithMarqetaIntegration,
          merchant: testMerchantWithKardIntegration,
          company: testMerchantCompany,
          amount: 1000,
          integrations: testWildfireIntegration,
          status: KarmaCommissionStatus.PendingPaymentToUser,
        },
      ] as Partial<ICommissionDocument>[],
    })) as (ICommissionDocument & { user: IUserDocument })[];

    const testCommissionsForUserWithLinkedCard = testCommissions.filter(
      (c) => c.user._id.toString() === testUserWithLinkedCard._id.toString(),
    );

    ({ commissionsTotal: commissionsTotalForUserWithLinkedCard, commissionIds: commissionIdsForUserWithLinkedCard } = aggregateCommissionTotalAndIds(testCommissionsForUserWithLinkedCard));

    const testCommissionsForUserWithPaypalIntegration = testCommissions.filter(
      (c) => c.user._id.toString() === testUserWithPaypalIntegration._id.toString(),
    );
    ({
      commissionsTotal: commissionsTotalForUserWithPaypalIntegration,
      commissionIds: commissionIdsForUserWithPaypalIntegration,
    } = aggregateCommissionTotalAndIds(testCommissionsForUserWithPaypalIntegration));

    const testCommissionsForUserWithMarqetaIntegration = testCommissions.filter(
      (c) => c.user._id.toString() === testUserWithMarqetaIntegration._id.toString(),
    );
    ({
      commissionsTotal: commissionsTotalForUserWithMarqetaIntegration,
      commissionIds: commissionIdsForUserWithMarqetaIntegration,
    } = aggregateCommissionTotalAndIds(testCommissionsForUserWithMarqetaIntegration));

    testCommissionPayouts = await createSomeCommissionPayouts({
      commissionPayouts: [
        {
          user: testUserWithLinkedCard,
          commissions: commissionIdsForUserWithLinkedCard,
          amount: commissionsTotalForUserWithLinkedCard,
          date: getUtcDate().toDate(),
          status: KarmaCommissionPayoutStatus.Pending,
        },
        {
          user: testUserWithPaypalIntegration,
          commissions: commissionIdsForUserWithPaypalIntegration,
          amount: commissionsTotalForUserWithPaypalIntegration,
          date: getUtcDate().toDate(),
          status: KarmaCommissionPayoutStatus.Pending,
        },
        {
          user: testUserWithMarqetaIntegration,
          commissions: commissionIdsForUserWithMarqetaIntegration,
          amount: commissionsTotalForUserWithMarqetaIntegration,
          date: getUtcDate().toDate(),
          status: KarmaCommissionPayoutStatus.Pending,
        },
      ],
    });
  });

  it('generateCommissionPayoutOverview calculates source and destination breakdowns', async () => {
    const res = await generateCommissionPayoutOverview(new Date());
    const commissionPayoutOverview = res as ICommissionPayoutOverviewDocument;
    expect(commissionPayoutOverview).toBeDefined();
    expect(commissionPayoutOverview).not.toBeNull();
    // expect the breakdown to be correctish gives these may some day run in prod or
    // staging and the amounts will be different
    expect(commissionPayoutOverview.breakdown).toBeDefined();
    expect(commissionPayoutOverview.breakdown).not.toBeNull();

    expect(commissionPayoutOverview.breakdown.kard).toBeDefined();
    expect(commissionPayoutOverview.breakdown.kard).not.toBeNull();
    const minKardCommissionAmount = commissionsTotalForUserWithPaypalIntegration; // user with paypal also has kard commissions
    expect(commissionPayoutOverview.breakdown.kard).toBeGreaterThanOrEqual(minKardCommissionAmount);

    expect(commissionPayoutOverview.breakdown.wildfire).toBeDefined();
    expect(commissionPayoutOverview.breakdown.wildfire).not.toBeNull();
    const minWildfireCommissionAmount = commissionsTotalForUserWithLinkedCard; // user with no integrations also has wildfire commissions
    expect(commissionPayoutOverview.breakdown.wildfire).toBeGreaterThanOrEqual(minWildfireCommissionAmount);

    expect(commissionPayoutOverview.breakdown.karma).toBeDefined();
    expect(commissionPayoutOverview.breakdown.karma).not.toBeNull();
    const minKarmaCommissionAmount = commissionsTotalForUserWithMarqetaIntegration; // user with linked card also has to have karma commissions
    expect(commissionPayoutOverview.breakdown.karma).toBeGreaterThanOrEqual(minKarmaCommissionAmount);
    // expect that the destination breakdown is correctish
    expect(commissionPayoutOverview.disbursementBreakdown).toBeDefined();
    expect(commissionPayoutOverview.disbursementBreakdown).not.toBeNull();

    expect(commissionPayoutOverview.disbursementBreakdown.paypal).toBeDefined();
    expect(commissionPayoutOverview.disbursementBreakdown.paypal).not.toBeNull();
    expect(commissionPayoutOverview.disbursementBreakdown.paypal).toBeGreaterThanOrEqual(
      commissionsTotalForUserWithPaypalIntegration,
    );

    expect(commissionPayoutOverview.disbursementBreakdown.marqeta).toBeDefined();
    expect(commissionPayoutOverview.disbursementBreakdown.marqeta).not.toBeNull();
    expect(commissionPayoutOverview.disbursementBreakdown.marqeta).toBeGreaterThanOrEqual(
      commissionsTotalForUserWithMarqetaIntegration,
    );

    expect(commissionPayoutOverview.disbursementBreakdown.unknown).toBeDefined();
    expect(commissionPayoutOverview.disbursementBreakdown.unknown).not.toBeNull();
    expect(commissionPayoutOverview.disbursementBreakdown.unknown).toBeGreaterThanOrEqual(commissionsTotalForUserWithLinkedCard);
  });
});
