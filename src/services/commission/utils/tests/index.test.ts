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
import { getUtcDate } from '../../../../lib/date';
import { getRandomInt } from '../../../../lib/number';
import { createSomeCompanies, createSomeMerchants, createSomeUsers } from '../../../../lib/testingUtils';
import { ICommissionDocument } from '../../../../models/commissions';
import { ICompanyDocument } from '../../../../models/company';
import { IMerchantDocument } from '../../../../models/merchant';
import { IUserDocument, UserEmailStatus } from '../../../../models/user';

describe('tests commission utils logic', () => {
  let testUserWithKardIntegration: IUserDocument;
  let testMerchantWithKardIntegration: IMerchantDocument;
  let testMerchantCompany: ICompanyDocument;
  const testUserWithKardIntegrationCardInfo = {
    last4: getRandomInt(1000, 9999).toString(),
    bin: getRandomInt(100000, 999999).toString(),
    network: CardNetwork.Visa,
  };
  let testEarnedWebhookBody: EarnedRewardWebhookBody | null = null;

  afterEach(() => {
    /* clean up between tests */
  });

  afterAll(async () => {
    // clean up db
    await testUserWithKardIntegration?.remove();
    await testMerchantWithKardIntegration?.remove();
    await testMerchantCompany?.remove();
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

    [testUserWithKardIntegration] = await createSomeUsers({
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
          integrations: {
            kard: {
              userId: randomUUID(),
              dateAccountCreated: getUtcDate().toDate(),
            },
          },
        },
      ],
    });

    testEarnedWebhookBody = {
      issuer: process.env.KARD_ISSUER_NAME || 'test issuer',
      user: {
        referringPartnerUserId: testUserWithKardIntegration.integrations.kard.userId,
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
  });

  it('mapKardCommissionToKarmaCommisison processes a valid EarnedWebhookBody successfully', async () => {
    const karmaCommission = (await mapKardCommissionToKarmaCommisison(testEarnedWebhookBody)) as ICommissionDocument;

    expect(karmaCommission).toBeDefined();
    expect(karmaCommission).not.toBeNull();
    expect(karmaCommission).toHaveProperty('allocation');
    expect(karmaCommission.allocation.user).toBe(7.5);
    expect(karmaCommission.allocation.karma).toBe(2.5);
    await karmaCommission.remove();
  });
});
