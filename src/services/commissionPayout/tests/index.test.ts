import { afterAll, afterEach, beforeAll, describe, expect, it } from '@jest/globals';
import { randomUUID } from 'crypto';
import { ObjectId, Types } from 'mongoose';
import {
  CommissionPayoutWithCommissionsAndUsers,
  CommissionWithUser,
  getPayoutsWithUsersOnCommissions,
  getPendingPayoutDisbursementBreakdown,
  getPendingPayoutsWithUsersOnCommissions,
} from '..';
import { MerchantSource, RewardType, RewardStatus } from '../../../clients/kard';
import { MongoClient } from '../../../clients/mongo';
import { IMarqetaKycState } from '../../../integrations/marqeta/types';
import { CardNetwork, CardStatus, KardEnrollmentStatus } from '../../../lib/constants';
import { getUtcDate } from '../../../lib/date';
import { cleanUpDocuments } from '../../../lib/model';
import { getRandomInt } from '../../../lib/number';
import {
  createSomeUsers,
  createSomeCompanies,
  createSomeCards,
  createSomeCommissionPayouts,
  createSomeCommissions,
  createSomeMerchants,
} from '../../../lib/testingUtils';
import { ICardDocument } from '../../../models/card';
import { ICommissionPayoutDocument, KarmaCommissionPayoutStatus } from '../../../models/commissionPayout';
import { ICommissionDocument, WildfireCommissionStatus, KarmaCommissionStatus } from '../../../models/commissions';
import { ICompanyDocument } from '../../../models/company';
import { IMerchantDocument } from '../../../models/merchant';
import { IUserDocument, UserEmailStatus } from '../../../models/user';
import { aggregateCommissionTotalAndIds } from '../../commission/utils';
import { IMarqetaUserState } from '../../karmaCard/utils';

describe('tests payout service logic', () => {
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
              status: IMarqetaUserState.active,
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

  it('getPendingPayoutsWithUsersOnCommissions looks up users for pending payouts', async () => {
    const payouts = await getPendingPayoutsWithUsersOnCommissions();
    expect(payouts.length).toBeGreaterThan(0);
    console.log(`found ${payouts.length} pending payouts:`);
    payouts.forEach((p, payoutIndex) => {
      console.log(`  payout ${payoutIndex} has ${p.commissions.length} commissions:`);
      p.commissions.forEach((c, commissionIndex) => {
        const commissionWithUser = c as CommissionWithUser;
        console.log(`    commission ${commissionIndex} allocates ${commissionWithUser.allocation.user} to the user`);
        expect(commissionWithUser).not.toBeNull();
        expect(commissionWithUser._id).not.toBeNull();
        expect(commissionWithUser.user).toBeDefined();
        expect(commissionWithUser.user._id).toBeDefined();
        expect(commissionWithUser.user._id).not.toBeNull();
      });
    });
  });

  it('getPayoutsWithUsersOnCommissions calculates breakdown of passed in payouts', async () => {
    const payouts = await getPayoutsWithUsersOnCommissions(testCommissionPayouts);

    expect(payouts.length).toEqual(testCommissionPayouts.length);
    payouts.forEach((p) => {
      p.commissions.forEach((c) => {
        const commissionWithUser = c as CommissionWithUser;
        expect(commissionWithUser).not.toBeNull();
        expect(commissionWithUser._id).not.toBeNull();
        expect(commissionWithUser.user).toBeDefined();
        expect(commissionWithUser.user._id).toBeDefined();
        expect(commissionWithUser.user._id).not.toBeNull();
      });
    });
  });

  it('getPendingPayoutDisbursementBreakdown calculates breakdown of payout disbursement channel', async () => {
    // Test data requirements:
    // this function could take an array of the test commission payouts (withCommissions and users)
    const commissionPayouts: CommissionPayoutWithCommissionsAndUsers[] = testCommissionPayouts.map((cp) => ({
      ...cp,
      commissions: cp.commissions.map((commissionId) => testCommissions.find((c) => c._id.toString() === commissionId.toString())),
    }));
    const breakdown = getPendingPayoutDisbursementBreakdown(commissionPayouts);
    console.log(JSON.stringify(breakdown, null, 2));

    expect(breakdown.total).toEqual(
      testCommissions
        .filter((c) => c.status === KarmaCommissionStatus.PendingPaymentToUser)
        .reduce((acc, c) => acc + c.allocation.user, 0),
    );
    expect(breakdown.paypal).toEqual(
      testCommissions
        .filter(
          (c) => c.status === KarmaCommissionStatus.PendingPaymentToUser
            && !!c.user.integrations?.paypal?.payerId
            && !c.user?.integrations?.marqeta?.userToken,
        )
        .reduce((acc, c) => acc + c.allocation.user, 0),
    );
    expect(breakdown.marqeta).toEqual(
      testCommissions
        .filter(
          (c) => c.status === KarmaCommissionStatus.PendingPaymentToUser && !!c.user?.integrations?.marqeta?.userToken,
        )
        .reduce((acc, c) => acc + c.allocation.user, 0),
    );

    expect(breakdown.unknown).toEqual(
      testCommissions
        .filter(
          (c) => c.status === KarmaCommissionStatus.PendingPaymentToUser
            && !c.user.integrations?.paypal?.payerId
            && !c.user?.integrations?.marqeta?.userToken,
        )
        .reduce((acc, c) => acc + c.allocation.user, 0),
    );
  });
});
