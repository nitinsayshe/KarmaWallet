import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { AxiosResponse } from 'axios';
import { randomUUID } from 'crypto';
import dayjs from 'dayjs';
import { now } from 'lodash';
import { createKardUserAndAddIntegrations, getCardInfo, deleteKardUser, queueSettledTransactions } from '..';
import { MerchantSource, OfferType, CommissionType, KardClient, TransactionStatus } from '../../../clients/kard';
import { MongoClient } from '../../../clients/mongo';
import { CardNetwork, CardStatus } from '../../../lib/constants';
import { getUtcDate } from '../../../lib/date';
import { encrypt } from '../../../lib/encryption';
import { getRandomInt } from '../../../lib/number';
import {
  cleanUpDocuments,
  createSomeUsers,
  CreateTestCardsRequest,
  createSomeCards,
  createSomeMerchants,
  createSomeMerchantRates,
  createSomeCompanies,
  createSomeTransactions,
} from '../../../lib/testingUtils';
import { ICardDocument, CardModel } from '../../../models/card';
import { ICompanyDocument } from '../../../models/company';
import { IMerchantDocument } from '../../../models/merchant';
import { IMerchantRateDocument } from '../../../models/merchantRate';
import { ITransactionDocument } from '../../../models/transaction';
import { IUserDocument, UserEmailStatus, UserModel } from '../../../models/user';

describe.skip('kard client interface can fetch session tokes, create, update, and delete users, and queue transactions for processing', () => {
  let testUserWithLinkedAccountNoKardIntegration: IUserDocument;
  let testUserWithKardIntegration: IUserDocument;
  let testUserWithNoCard: IUserDocument;
  let testCards: ICardDocument[];
  let transactionsToQueue: ITransactionDocument[];
  let testMerchant: IMerchantDocument;
  let testMerchantRates: IMerchantRateDocument[];
  let testCompany: ICompanyDocument;
  const dateCardAdded: Date = getUtcDate().toDate();
  const testsStartDate: Date = getUtcDate().toDate();

  const testUserWithKardIntegrationCardInfo = {
    last4: getRandomInt(1000, 9999).toString(),
    bin: `4${getRandomInt(10000, 99999).toString()}`,
    issuer: 'test issuer',
    network: CardNetwork.Visa,
  };

  const testUserWithLinkedAccountNoKardIntegrationCardInfo = {
    last4: getRandomInt(1000, 9999).toString(),
    bin: `5${getRandomInt(10000, 99999).toString()}`,
    issuer: 'test issuer',
    network: CardNetwork.Mastercard,
  };

  beforeEach(() => {});

  afterEach(() => {
    /* clean up between tests */
  });

  afterAll(async () => {
    // clean up db
    await cleanUpDocuments([
      ...testCards,
      ...transactionsToQueue,
      ...testMerchantRates,
      testCompany,
      testUserWithLinkedAccountNoKardIntegration,
      testUserWithKardIntegration,
      testUserWithNoCard,
      testMerchant,
    ]);

    MongoClient.disconnect();
  });

  beforeAll(async () => {
    await MongoClient.init();

    [testUserWithNoCard, testUserWithKardIntegration, testUserWithLinkedAccountNoKardIntegration] = await createSomeUsers({
      users: [
        {
          name: 'testUserWithNoCard User',
          emails: [
            { email: 'testUserWithNoCardEmail@testEmail.com', primary: true, status: UserEmailStatus.Verified },
          ],
        },
        {
          name: 'testUserWithKardIntegration User',
          emails: [
            {
              email: 'testUserWithKardIntegration@testEmail.com',
              primary: true,
              status: UserEmailStatus.Verified,
            },
          ],
          integrations: {
            kard: {
              userId: randomUUID(),
              dateAccountCreated: testsStartDate,
            },
          },
        },
        {
          name: 'testUserWithLinkedAccountNoKardIntegration User',
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

    const createCardsReq: CreateTestCardsRequest = {
      cards: [
        {
          userId: testUserWithKardIntegration._id,
          status: CardStatus.Linked,
          institution: testUserWithKardIntegrationCardInfo.issuer,
          lastFourDigitsToken: encrypt(testUserWithKardIntegrationCardInfo.last4),
          binToken: encrypt(testUserWithKardIntegrationCardInfo.bin),
          integrations: { kard: { dateAdded: dateCardAdded } },
        },
        {
          userId: testUserWithLinkedAccountNoKardIntegration._id,
          status: CardStatus.Linked,
          institution: testUserWithLinkedAccountNoKardIntegrationCardInfo.issuer,
          lastFourDigitsToken: encrypt(testUserWithLinkedAccountNoKardIntegrationCardInfo.last4),
          binToken: encrypt(testUserWithLinkedAccountNoKardIntegrationCardInfo.bin),
        },
      ],
    };

    testCards = await createSomeCards(createCardsReq);

    [testMerchant] = await createSomeMerchants({
      merchants: [
        {
          name: 'Focal Point',
          integrations: {
            kard: {
              id: '629f6e2db5df7700096f8848',
              name: 'Focal Point',
              description:
                'Celebrating a Special Occasion? Sharing and Announcement? Create photo books, cards, invitations, and personalized gifts all from the Focal Point Website and App. ',
              source: MerchantSource.NATIONAL,
              category: 'Books & Digital Media',
              imgUrl: 'https://assets.getkard.com/public/logos/kard.jpg',
              bannerImgUrl: 'https://assets.getkard.com/public/banners/kard.jpg',
              websiteURL: 'https://www.kardfocalpoint.com',
              acceptedCards: [CardNetwork.Visa, CardNetwork.Mastercard, CardNetwork.Amex],
              createdDate: '2022-06-07T15:26:37.783Z',
              lastModified: '2023-05-10T19:43:10.320Z',
              maxOffer: {
                merchantId: '629f6e2db5df7700096f8848',
                name: 'Focal Point Outdated',
                offerType: OfferType.ONLINE,
                isLocationSpecific: false,
                optInRequired: false,
                startDate: '2022-06-01T06:00:00.000Z',
                expirationDate: '2024-06-01T06:00:00.000Z',
                terms: 'N/A',
                totalCommission: 2,
                commissionType: CommissionType.FLAT,
                createdDate: '2022-09-14T16:08:56.012Z',
                lastModified: '2023-05-10T19:40:18.392Z',
                redeemableOnce: false,
              },
            },
          },
        },
      ],
    });

    testMerchantRates = await createSomeMerchantRates({
      merchantRates: [
        {
          merchant: testMerchant._id,
          lastModified: dayjs().subtract(1, 'day').toDate(),
          integrations: {
            kard: {
              id: '6321fc98ab7ecc00097c88db',
              merchantId: '629f6e2db5df7700096f8848',
              name: 'Focal Point',
              offerType: OfferType.INSTORE,
              isLocationSpecific: false,
              optInRequired: false,
              startDate: '2022-06-01T06:00:00.000Z',
              expirationDate: '2024-06-01T06:00:00.000Z',
              terms: 'N/A',
              totalCommission: 2,
              commissionType: CommissionType.FLAT,
              createdDate: '2022-09-14T16:08:56.012Z',
              lastModified: '2023-05-10T19:40:18.392Z',
              redeemableOnce: false,
            },
          },
        },
        {
          merchant: testMerchant._id,
          lastModified: dayjs().subtract(1, 'day').toDate(),
          integrations: {
            kard: {
              id: '629fc2cab7a4290009a188ed',
              merchantId: '629f6e2db5df7700096f8848',
              name: 'Focal Point',
              offerType: OfferType.ONLINE,
              isLocationSpecific: false,
              optInRequired: false,
              startDate: '2022-06-01T06:00:00.000Z',
              expirationDate: '2024-06-01T06:00:00.000Z',
              terms: 'N/A',
              totalCommission: 2,
              commissionType: CommissionType.PERCENT,
              createdDate: '2022-06-07T21:27:38.645Z',
              lastModified: '2023-05-10T19:43:10.173Z',
              redeemableOnce: false,
            },
          },
        },
      ],
    });

    // create companies
    [testCompany] = await createSomeCompanies({
      companies: [
        {
          companyName: testMerchant.name,
          url: testMerchant.integrations.kard.websiteURL,
          merchant: testMerchant._id,
          mcc: 7002,
        },
      ],
    });

    transactionsToQueue = await createSomeTransactions({
      transactions: [
        {
          userId: testUserWithKardIntegration._id,
          companyId: testCompany._id,
          company: testCompany,
          card: testCards[0],
          date: dayjs().subtract(1, 'week').toDate(),
          integrations: {
            kard: { id: randomUUID(), status: TransactionStatus.SETTLED },
            plaid: { iso_currency_code: 'USD' },
          },
        },
        {
          userId: testUserWithKardIntegration._id,
          companyId: testCompany._id,
          company: testCompany,
          card: testCards[0],
          date: dayjs().subtract(2, 'week').toDate(),
          integrations: {
            kard: { id: randomUUID(), status: TransactionStatus.SETTLED },
            plaid: { iso_currency_code: 'USD' },
          },
        },
        {
          userId: testUserWithKardIntegration._id,
          companyId: testCompany._id,
          company: testCompany,
          card: testCards[0],
          date: dayjs().subtract(3, 'week').toDate(),
          integrations: {
            kard: { id: randomUUID(), status: TransactionStatus.SETTLED },
            plaid: { iso_currency_code: 'USD' },
          },
        },
      ],
    });
  });

  it('createKardUserAndAddIntegrations creates new kard user and adds new card', async () => {
    await createKardUserAndAddIntegrations(testUserWithLinkedAccountNoKardIntegration, testCards[1]);
    // check that the user has a kard integration object
    const updatedUser = await UserModel.find({ _id: testUserWithLinkedAccountNoKardIntegration._id });

    expect(updatedUser?.[0]?.integrations.kard).toBeDefined();
    expect(updatedUser?.[0]?.integrations.kard.dateAccountCreated).toBeDefined();
    expect(dayjs(updatedUser?.[0]?.integrations.kard.dateAccountCreated).diff(testsStartDate)).toBeGreaterThan(0);
    expect(dayjs(updatedUser?.[0]?.integrations.kard.dateAccountCreated).diff(now())).toBeLessThan(0);

    const userCards = await CardModel.find({ userId: testUserWithLinkedAccountNoKardIntegration._id });
    expect(userCards.length).toBe(1);
    expect(userCards[0].integrations.kard.dateAdded).toBeDefined();
    expect(dayjs(userCards[0].integrations.kard.dateAdded).diff(dateCardAdded)).toBeGreaterThan(0);
    expect(dayjs(userCards[0].integrations.kard.dateAdded).diff(now())).toBeLessThan(0);
  });

  it('deleteKardUser looks up user by their id and removes user from kard', async () => {
    // create kard user to be deleted
    const cardInfo = getCardInfo(testCards[0]);
    const kardClient = new KardClient();
    const newKardUser = await kardClient.createUser({
      email: testUserWithKardIntegration.emails[0].email,
      referringPartnerUserId: testUserWithKardIntegration.integrations.kard.userId,
      userName: testUserWithKardIntegration.name.trim().split(' ').join(''),
      cardInfo,
    });
    /* sleep(1000); */
    expect(newKardUser).toBeDefined();
    const res = await deleteKardUser(testUserWithKardIntegration._id);
    expect((res as AxiosResponse)?.status).toBe(200);
  });

  it('deleteKardUser works when provided user document', async () => {
    // create kard user to be deleted
    const cardInfo = getCardInfo(testCards[0]);
    const kardClient = new KardClient();
    const newKardUser = await kardClient.createUser({
      email: testUserWithKardIntegration.emails[0].email,
      referringPartnerUserId: testUserWithKardIntegration.integrations.kard.userId,
      userName: testUserWithKardIntegration.name.trim().split(' ').join(''),
      cardInfo,
    });
    /* sleep(1000); */
    expect(newKardUser).toBeDefined();
    const res = await deleteKardUser(testUserWithKardIntegration);
    expect((res as AxiosResponse)?.status).toBe(200);
  });

  it('queueSettledTransactions prepares and submits transactions to Kard', async () => {
    // create kard user to be deleted
    const cardInfo = getCardInfo(testCards[0]);
    const kardClient = new KardClient();
    const newKardUser = await kardClient.createUser({
      email: testUserWithKardIntegration.emails[0].email,
      referringPartnerUserId: testUserWithKardIntegration.integrations.kard.userId,
      userName: testUserWithKardIntegration.name.trim().split(' ').join(''),
      cardInfo,
    });
    expect(newKardUser).toBeDefined();
    const res = await queueSettledTransactions(testUserWithKardIntegration._id, transactionsToQueue);
    expect(res).toBeDefined();
    expect((res as AxiosResponse)?.status).toBe(201);

    // clean up
    await deleteKardUser(testUserWithKardIntegration);
  });

  it('queueSettledTransactions works when provided the user document', async () => {
    // create kard user to be deleted
    const cardInfo = getCardInfo(testCards[0]);
    const kardClient = new KardClient();
    const newKardUser = await kardClient.createUser({
      email: testUserWithKardIntegration.emails[0].email,
      referringPartnerUserId: testUserWithKardIntegration.integrations.kard.userId,
      userName: testUserWithKardIntegration.name.trim().split(' ').join(''),
      cardInfo,
    });
    expect(newKardUser).toBeDefined();
    const res = await queueSettledTransactions(testUserWithKardIntegration, transactionsToQueue);
    expect(res).toBeDefined();
    expect((res as AxiosResponse)?.status).toBe(201);

    // clean up
    await deleteKardUser(testUserWithKardIntegration);
  });
});
