import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AxiosResponse } from 'axios';
import { randomUUID } from 'crypto';
import { deleteKardUser, getCardInfo, updateKardData } from '..';
import { KardClient } from '../../../clients/kard';
import { MongoClient } from '../../../clients/mongo';
import { CardNetwork, CardStatus } from '../../../lib/constants';
import { getUtcDate } from '../../../lib/date';
import { encrypt } from '../../../lib/encryption';
import { getRandomInt } from '../../../lib/number';
import { createSomeCards, createSomeUsers, CreateTestCardsRequest } from '../../../lib/testingUtils';
import { CardModel, ICardDocument } from '../../../models/card';
import { IUserDocument, UserEmailStatus, UserModel } from '../../../models/user';

describe.skip('kard client interface can fetch session tokes, create, update, and delete users, and queue transactions for processing', () => {
  const OLD_ENV = process.env;

  let testUserWithLinkedAccountNoKardIntegration: IUserDocument;
  let testUserWithKardIntegration: IUserDocument;
  let testUserWithNoCard: IUserDocument;
  let testCards: ICardDocument[];
  const dateCardAdded: Date = getUtcDate().toDate();
  const dateKardAccountCreated: Date = getUtcDate().toDate();

  const testUserWithKardIntegrationCardInfo = {
    last4: getRandomInt(1000, 9999).toString(),
    bin: getRandomInt(100000, 999999).toString(),
    issuer: 'test issuer',
    network: CardNetwork.Visa,
  };
  const testUserWithLinkedAccountNoKardIntegrationCardInfo = {
    last4: getRandomInt(1000, 9999).toString(),
    bin: getRandomInt(100000, 999999).toString(),
    issuer: 'test issuer',
    network: CardNetwork.Mastercard,
  };
  beforeEach(() => {
    jest.resetModules(); // clears the cache
    process.env = { ...OLD_ENV }; // Make a copy of the current environment
    process.env.ENCRYPTION_SECRET_KEY = 'TestSecretKey';
    process.env.ENCRYPTION_SECRET_INITIALIZATION_VECTOR = 'TestSecretInitializationVector';
    process.env.ENCRYPTION_METHOD = 'aes-256-cbc';
  });

  afterEach(() => {
    /* clean up between tests */
  });

  afterAll(async () => {
    // clean up db
    await Promise.all(testCards.map(async (card) => card.remove()));

    await testUserWithLinkedAccountNoKardIntegration.remove();
    await testUserWithKardIntegration.remove();
    await testUserWithNoCard.remove();

    MongoClient.disconnect();

    process.env = OLD_ENV; // Restore old environment
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
          name: 'testUserWithLinkedAccountNoKardIntegration User',
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
              dateAccountCreated: dateKardAccountCreated,
              dateAccountUpdated: dateKardAccountCreated,
            },
          },
        },
        {
          name: 'testUserWithKardIntegration User',
          emails: [
            { email: 'testUserWithKardIntegration@testEmail.com', primary: true, status: UserEmailStatus.Verified },
          ],
          integrations: {
            kard: {
              userId: randomUUID(),
              dateAccountCreated: dateKardAccountCreated,
              dateAccountUpdated: dateKardAccountCreated,
            },
          },
        },
      ],
    });

    process.env.ENCRYPTION_SECRET_KEY = 'TestSecretKey';
    process.env.ENCRYPTION_SECRET_INITIALIZATION_VECTOR = 'TestSecretInitializationVector';
    process.env.ENCRYPTION_METHOD = 'aes-256-cbc';

    const createCardsReq: CreateTestCardsRequest = {
      cards: [
        {
          userId: testUserWithKardIntegration._id,
          status: CardStatus.Linked,
          institution: testUserWithKardIntegrationCardInfo.issuer,
          lastFourDigitsToken: encrypt(testUserWithKardIntegrationCardInfo.last4),
          binToken: encrypt(testUserWithKardIntegrationCardInfo.bin),
          networkToken: encrypt(testUserWithKardIntegrationCardInfo.network),
          integrations: { kard: { dateAdded: dateCardAdded } },
        },
        {
          userId: testUserWithLinkedAccountNoKardIntegration._id,
          status: CardStatus.Linked,
          institution: testUserWithLinkedAccountNoKardIntegrationCardInfo.issuer,
          lastFourDigitsToken: encrypt(testUserWithLinkedAccountNoKardIntegrationCardInfo.last4),
          binToken: encrypt(testUserWithLinkedAccountNoKardIntegrationCardInfo.bin),
          networkToken: encrypt(testUserWithLinkedAccountNoKardIntegrationCardInfo.network),
        },
      ],
    };
    testCards = await createSomeCards(createCardsReq);
  });

  // jest isn't working with mongoose here
  it.skip('updateKardData creates new kard user and adds new card', async () => {
    await updateKardData(testUserWithLinkedAccountNoKardIntegration._id);
    // check that the user has a kard integration object
    const updatedUser = await UserModel.find({ userId: testUserWithLinkedAccountNoKardIntegration._id });

    expect(updatedUser?.[0]?.integrations.kard).toBeDefined();
    expect(updatedUser?.[0]?.integrations.kard.dateAccountCreated).toBe(dateKardAccountCreated);
    expect(updatedUser?.[0]?.integrations.kard.userId).toBe(testUserWithNoCard._id);
    expect(updatedUser?.[0]?.integrations.kard.dateAccountUpdated).toBe(dateKardAccountCreated);

    const userCards = await CardModel.find({ userId: testUserWithNoCard._id });
    expect(userCards.length).toBe(1);
    expect(userCards[0].integrations.kard.dateAdded).toBe(dateCardAdded);
  });

  it.skip('deleteKardUser looks up user by their id and removes user from kard', async () => {
    // add this test user to kard

    const kardClient = new KardClient();
    const cardInfo = getCardInfo(testCards[0]);
    await kardClient.createUser({
      email: testUserWithKardIntegration.emails[0].email,
      referringPartnerUserId: testUserWithKardIntegration.integrations.kard.userId,
      userName: testUserWithKardIntegration.name.trim().split(' ').join(''),
      cardInfo,
    });

    const res = await deleteKardUser(testUserWithKardIntegration._id);
    expect((res as AxiosResponse).status).toBe(200);
  });
});
