import { afterAll, afterEach, beforeAll, describe, expect, it } from '@jest/globals';
import { randomUUID } from 'crypto';
import { mapKardCommissionToKarmaCommisison } from '..';
import {
  CardNetwork,
  EarnedRewardWebhookBody,
  MerchantSource,
  RewardStatus,
  RewardType,
  TransactionStatus,
} from '../../../../clients/kard';
import { MongoClient } from '../../../../clients/mongo';
import { CardStatus, KardEnrollmentStatus } from '../../../../lib/constants';
import { getUtcDate } from '../../../../lib/date';
import { getRandomInt } from '../../../../lib/number';
import {
  cleanUpDocuments,
  createSomeCards,
  createSomeCommissions,
  createSomeCompanies,
  createSomeMerchants,
  createSomeTransactions,
  createSomeUsers,
} from '../../../../lib/testingUtils';
import { ICardDocument } from '../../../../models/card';
import { ICommissionDocument } from '../../../../models/commissions';
import { ICompanyDocument } from '../../../../models/company';
import { IMerchantDocument } from '../../../../models/merchant';
import { INotificationDocument, NotificationStatus, NotificationType } from '../../../../models/notification';
import { ITransactionDocument } from '../../../../models/transaction';
import { IUserDocument, UserEmailStatus } from '../../../../models/user';
import { createEarnedCashbackNotificationFromCommission } from '../../../notification';

describe('tests commission utils logic', () => {
  let testUserWithLinkedCard: IUserDocument;
  let testCardWithKardIntegration: ICardDocument;
  let testMerchantWithKardIntegration: IMerchantDocument;
  let testMerchantCompany: ICompanyDocument;
  const testUserWithKardIntegrationCardInfo = {
    last4: getRandomInt(1000, 9999).toString(),
    bin: getRandomInt(100000, 999999).toString(),
    network: CardNetwork.Visa,
  };
  let testEarnedWebhookBody: EarnedRewardWebhookBody | null = null;
  let testCommission: ICommissionDocument;
  let testTransactions: ITransactionDocument[] = [];

  afterEach(() => {
    /* clean up between tests */
  });

  afterAll(async () => {
    // clean up db
    await cleanUpDocuments([
      testUserWithLinkedCard,
      testMerchantWithKardIntegration,
      testMerchantCompany,
      testCommission,
      testCardWithKardIntegration,
      ...testTransactions,
    ]);

    MongoClient.disconnect();
  });

  beforeAll(async () => {
    await MongoClient.init();
    // add an existing cimmission with the kard integration to test case where we alreadyhave a commission with the same transaction id
    // expects a merchant to exist that has a kard integration

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

    [testUserWithLinkedCard] = await createSomeUsers({
      users: [
        {
          name: 'testUserWithKardIntegration User',
          emails: [
            {
              email: 'testUserWithLinkedAccountNoKardIntegration@testEmail.com',
              primary: true,
              status: UserEmailStatus.Verified,
            },
          ],
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

    [testCommission] = await createSomeCommissions({
      commissions: [
        {
          user: testUserWithLinkedCard,
          merchant: testMerchantWithKardIntegration,
          company: testMerchantCompany,
        },
      ],
    });
    testEarnedWebhookBody = {
      issuer: process.env.KARD_ISSUER_NAME || 'test issuer',
      user: {
        referringPartnerUserId: testCardWithKardIntegration.integrations.kard.userId,
      },
      reward: {
        merchantId: testMerchantWithKardIntegration.integrations.kard.id,
        name: testMerchantWithKardIntegration.integrations.kard.name,
        type: RewardType.CARDLINKED,
        status: RewardStatus.SETTLED,
        commissionToIssuer: 1000, // $10
      },
      card: testUserWithKardIntegrationCardInfo,
      transaction: {
        issuerTransactionId: randomUUID().toString(), // id that is added when we send the transaction to kard
        transactionId: randomUUID().toString(), // kard's id for the transaction
        transactionAmountInCents: 10000, // $100
        status: TransactionStatus.SETTLED,
        itemsOrdered: [],
        transactionTimeStamp: getUtcDate().toString(),
      },
      postDineInLinkURL: 'https://www.test.com',
      error: null,
    } as EarnedRewardWebhookBody;

    testTransactions = await createSomeTransactions({
      transactions: [
        {
          user: testUserWithLinkedCard,
          card: testCardWithKardIntegration,
          integrations: {
            kard: {
              id: testEarnedWebhookBody.transaction.issuerTransactionId,
              status: TransactionStatus.SETTLED,
            },
          },
          company: testMerchantCompany,
          amount: 10000,
          createdOn: getUtcDate().toDate(),
        },
      ],
    });
  });

  it('createEarnedCashbackNotificaiton creates a valid EarnedCashbackNotification', async () => {
    const earnedRewardNotification = await createEarnedCashbackNotificationFromCommission(testCommission, true);
    expect(earnedRewardNotification).toBeDefined();
    expect(earnedRewardNotification).not.toBeNull();
    const n = earnedRewardNotification as INotificationDocument;
    expect((n.user as IUserDocument)._id.toString()).toBe((testCommission.user as IUserDocument)._id.toString());
    expect(n.type).toBe(NotificationType.EarnedCashback);
    expect(n.status).toBe(NotificationStatus.Unread);
    expect(n.data).toBeDefined();
    expect(n.data).not.toBeNull();
    expect(n.data).toHaveProperty('name');
    expect(n.data).toHaveProperty('companyName');
    expect(n.body).toBeDefined();
    expect(n.body).not.toBeNull();
    await n.remove();
  });

  it('mapKardCommissionToKarmaCommisison processes a valid EarnedWebhookBody successfully', async () => {
    const karmaCommission = (await mapKardCommissionToKarmaCommisison(testEarnedWebhookBody)) as ICommissionDocument;

    expect(karmaCommission).toBeDefined();
    expect(karmaCommission).not.toBeNull();
    expect(karmaCommission).toHaveProperty('allocation');
    expect(karmaCommission.allocation.user).toBe(7.5);
    expect(karmaCommission.allocation.karma).toBe(2.5);
    await karmaCommission.remove();
  }, 10000);
});
