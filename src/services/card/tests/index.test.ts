import { afterAll, afterEach, beforeAll, describe, expect, it } from '@jest/globals';
import { randomUUID } from 'crypto';
import { KardRewardsParams, KardRewardsRegisterRequest, enrollInKardRewards, unenrollFromKardRewards } from '..';
import { KardClient } from '../../../clients/kard';
import { MongoClient } from '../../../clients/mongo';
import { getCardInfo } from '../../../integrations/kard';
import { CardNetwork, CardStatus, KardEnrollmentStatus } from '../../../lib/constants';
import { getUtcDate } from '../../../lib/date';
import { encrypt } from '../../../lib/encryption';
import { getRandomInt } from '../../../lib/number';
import { cleanUpDocuments, createSomeCards, createSomeUsers } from '../../../lib/testingUtils';
import { ICardDocument } from '../../../models/card';
import { IUserDocument } from '../../../models/user';
import { IRequest } from '../../../types/request';

describe('tests card service logic', () => {
  let testUser: IUserDocument;
  let testCard: ICardDocument;

  let testUserToBeUnenrolled: IUserDocument;
  let testCardWithKardIntegration: ICardDocument;

  const testUserToBeUnenrolledCardInfo = {
    last4: getRandomInt(1000, 9999).toString(),
    bin: `4${getRandomInt(10000, 99999).toString()}`,
    issuer: 'test issuer',
    network: CardNetwork.Visa,
  };

  afterEach(() => {
    /* clean up between tests */
  });

  afterAll(async () => {
    // clean up db
    await cleanUpDocuments([testUser, testCard, testUserToBeUnenrolled, testCardWithKardIntegration]);

    MongoClient.disconnect();
  });

  beforeAll(async () => {
    await MongoClient.init();

    // creat two test companies
    [testUser, testUserToBeUnenrolled] = await createSomeUsers({
      users: [{ name: 'Test Rewards User' }, { name: 'Test User' }],
    });
    [testCard, testCardWithKardIntegration] = await createSomeCards({
      cards: [
        { userId: testUser._id },
        {
          userId: testUserToBeUnenrolled._id,
          status: CardStatus.Linked,
          lastFourDigitsToken: encrypt(testUserToBeUnenrolledCardInfo.last4),
          binToken: encrypt(testUserToBeUnenrolledCardInfo.bin),
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

    // register user with kard
    const cardInfo = getCardInfo(testCardWithKardIntegration);
    const kardClient = new KardClient();
    await kardClient.createUser({
      email: testUserToBeUnenrolled.emails[0].email,
      referringPartnerUserId: testCardWithKardIntegration.integrations.kard.userId,
      userName: testUserToBeUnenrolled.name.trim().split(' ').join(''),
      cardInfo,
    });
  });

  // skipping to avoid hitting Kard API
  it.skip('enrollInKardRewards creates new Kard user and registers the provided card with Kard when user was not enrolled', async () => {
    const mockRequest = {
      requestor: testUser,
      authKey: '',
      params: { card: testCard._id },
      body: {
        bin: '423456',
        lastFour: '3456',
      },
    } as unknown as IRequest<KardRewardsParams, {}, KardRewardsRegisterRequest>;

    try {
      const updatedCard = await enrollInKardRewards(mockRequest);
      expect(updatedCard).toBeDefined();
      expect(updatedCard.integrations.kard).toBeDefined();
      expect(updatedCard.integrations.kard.userId).toBeDefined();

      expect(updatedCard.lastFourDigitsToken).toBeDefined();
      expect(updatedCard.binToken).toBeDefined();
    } catch (e) {
      expect(e).toBeUndefined();
    }
  });

  // skipping to avoid hitting Kard API
  it.skip('enrollInKardRewards returns errors when provided invalid input', async () => {
    const mockTestCases: {
      req: IRequest<KardRewardsParams, {}, KardRewardsRegisterRequest>;
      name: string;
      expectedError: string;
    }[] = [
      {
        name: 'enrollInKardRewards returns error if bin is invalid',
        expectedError: 'bin: Must be with a participating network: Visa, MasterCard, Discover, or American Express',
        req: {
          requestor: testUser,
          params: { card: testCard._id },
          body: {
            bin: '123456',
            lastFour: '3456',
          },
        } as unknown as IRequest<KardRewardsParams, {}, KardRewardsRegisterRequest>,
      },
      {
        name: 'enrollInKardRewards returns error if bin is too short',
        expectedError: 'bin: String must contain exactly 6 character(s)',
        req: {
          requestor: testUser,
          params: { card: testCard._id },
          body: {
            bin: '42345',
            lastFour: '3456',
          },
        } as unknown as IRequest<KardRewardsParams, {}, KardRewardsRegisterRequest>,
      },
      {
        name: 'enrollInKardRewards returns error if bin is too long',
        expectedError: 'bin: String must contain exactly 6 character(s)',
        req: {
          requestor: testUser,
          params: { card: testCard._id },
          body: {
            bin: '4234588',
            lastFour: '3456',
          },
        } as unknown as IRequest<KardRewardsParams, {}, KardRewardsRegisterRequest>,
      },
      {
        name: 'enrollInKardRewards returns error if bin is not a number',
        expectedError: 'bin: Must be a number',
        req: {
          requestor: testUser,
          params: { card: testCard._id },
          body: {
            bin: '4ello!',
            lastFour: '3456',
          },
        } as unknown as IRequest<KardRewardsParams, {}, KardRewardsRegisterRequest>,
      },
      {
        name: 'enrollInKardRewards returns error if lastFour is too short',
        expectedError: 'lastFour: String must contain exactly 4 character(s)',
        req: {
          requestor: testUser,
          params: { card: testCard._id },
          body: {
            bin: '423456',
            lastFour: '345',
          },
        } as unknown as IRequest<KardRewardsParams, {}, KardRewardsRegisterRequest>,
      },
      {
        name: 'enrollInKardRewards returns error if lastFour is too long',
        expectedError: 'lastFour: String must contain exactly 4 character(s)',
        req: {
          requestor: testUser,
          params: { card: testCard._id },
          body: {
            bin: '423456',
            lastFour: '34522',
          },
        } as unknown as IRequest<KardRewardsParams, {}, KardRewardsRegisterRequest>,
      },
      {
        name: 'enrollInKardRewards returns error if lastFour is not a number',
        expectedError: 'lastFour: Must be a number',
        req: {
          requestor: testUser,
          params: { card: testCard._id },
          body: {
            bin: '412345',
            lastFour: 'HAHA',
          },
        } as unknown as IRequest<KardRewardsParams, {}, KardRewardsRegisterRequest>,
      },
    ];

    mockTestCases.forEach(async (mockRequest) => {
      try {
        const updatedCard = await enrollInKardRewards(mockRequest.req);
        expect(updatedCard).toBeUndefined();
      } catch (e) {
        expect((e as Error).message).toEqual(mockRequest.expectedError);
      }
    });
  });

  it.skip('unenrollFromKardRewards sets kard integration to unenrolled status and deletes kard user', async () => {
    const mockRequest = {
      params: {
        card: testCardWithKardIntegration._id.toString(),
      } as KardRewardsParams,
    } as unknown as IRequest<KardRewardsParams, {}, {}>;
    const updatedCard = await unenrollFromKardRewards(mockRequest);
    expect(updatedCard.integrations.kard.enrollmentStatus).toBe(KardEnrollmentStatus.Unenrolled);
  });
});
