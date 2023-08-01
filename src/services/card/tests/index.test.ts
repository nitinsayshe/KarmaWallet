import { afterAll, afterEach, beforeAll, describe, expect, it } from '@jest/globals';
import { KardRewardsRegisterParams, KardRewardsRegisterRequest, registerInKardRewards } from '..';
import { MongoClient } from '../../../clients/mongo';
import { cleanUpDocuments, createSomeCards, createSomeUsers } from '../../../lib/testingUtils';
import { ICardDocument } from '../../../models/card';
import { IUserDocument } from '../../../models/user';
import { IRequest } from '../../../types/request';

describe('tests card service logic', () => {
  let testUser: IUserDocument;
  let testCard: ICardDocument;

  afterEach(() => {
    /* clean up between tests */
  });

  afterAll(async () => {
    // clean up db
    await cleanUpDocuments([testUser, testCard]);

    MongoClient.disconnect();
  });

  beforeAll(async () => {
    await MongoClient.init();

    // creat two test companies
    [testUser] = await createSomeUsers({
      users: [{ name: 'Test Rewards User' }],
    });
    [testCard] = await createSomeCards({
      cards: [{ userId: testUser._id }],
    });
  });

  // skipping to avoid hitting Kard API
  it.skip('registerInKardRewards creates new Kard user and registers the provided card with Kard when user was not enrolled', async () => {
    const mockRequest = {
      requestor: testUser,
      authKey: '',
      params: { card: testCard._id },
      body: {
        bin: '423456',
        lastFour: '3456',
      },
    } as unknown as IRequest<KardRewardsRegisterParams, {}, KardRewardsRegisterRequest>;

    try {
      const updatedCard = await registerInKardRewards(mockRequest);
      expect(updatedCard).toBeDefined();
      expect(updatedCard.integrations.kard).toBeDefined();
      expect(updatedCard.integrations.kard.dateAdded).toBeDefined();

      expect(updatedCard.lastFourDigitsToken).toBeDefined();
      expect(updatedCard.binToken).toBeDefined();
    } catch (e) {
      expect(e).toBeUndefined();
    }
  });

  // skipping to avoid hitting Kard API
  it.skip('registerInKardRewards returns errors when provided invalid input', async () => {
    const mockTestCases: {
      req: IRequest<KardRewardsRegisterParams, {}, KardRewardsRegisterRequest>;
      name: string;
      expectedError: string;
    }[] = [
      {
        name: 'registerInKardRewards returns error if bin is invalid',
        expectedError: 'bin: Must be with a participating network: Visa, MasterCard, Discover, or American Express',
        req: {
          requestor: testUser,
          params: { card: testCard._id },
          body: {
            bin: '123456',
            lastFour: '3456',
          },
        } as unknown as IRequest<KardRewardsRegisterParams, {}, KardRewardsRegisterRequest>,
      },
      {
        name: 'registerInKardRewards returns error if bin is too short',
        expectedError: 'bin: String must contain exactly 6 character(s)',
        req: {
          requestor: testUser,
          params: { card: testCard._id },
          body: {
            bin: '42345',
            lastFour: '3456',
          },
        } as unknown as IRequest<KardRewardsRegisterParams, {}, KardRewardsRegisterRequest>,
      },
      {
        name: 'registerInKardRewards returns error if bin is too long',
        expectedError: 'bin: String must contain exactly 6 character(s)',
        req: {
          requestor: testUser,
          params: { card: testCard._id },
          body: {
            bin: '4234588',
            lastFour: '3456',
          },
        } as unknown as IRequest<KardRewardsRegisterParams, {}, KardRewardsRegisterRequest>,
      },
      {
        name: 'registerInKardRewards returns error if bin is not a number',
        expectedError: 'bin: Must be a number',
        req: {
          requestor: testUser,
          params: { card: testCard._id },
          body: {
            bin: '4ello!',
            lastFour: '3456',
          },
        } as unknown as IRequest<KardRewardsRegisterParams, {}, KardRewardsRegisterRequest>,
      },
      {
        name: 'registerInKardRewards returns error if lastFour is too short',
        expectedError: 'lastFour: String must contain exactly 4 character(s)',
        req: {
          requestor: testUser,
          params: { card: testCard._id },
          body: {
            bin: '423456',
            lastFour: '345',
          },
        } as unknown as IRequest<KardRewardsRegisterParams, {}, KardRewardsRegisterRequest>,
      },
      {
        name: 'registerInKardRewards returns error if lastFour is too long',
        expectedError: 'lastFour: String must contain exactly 4 character(s)',
        req: {
          requestor: testUser,
          params: { card: testCard._id },
          body: {
            bin: '423456',
            lastFour: '34522',
          },
        } as unknown as IRequest<KardRewardsRegisterParams, {}, KardRewardsRegisterRequest>,
      },
      {
        name: 'registerInKardRewards returns error if lastFour is not a number',
        expectedError: 'lastFour: Must be a number',
        req: {
          requestor: testUser,
          params: { card: testCard._id },
          body: {
            bin: '412345',
            lastFour: 'HAHA',
          },
        } as unknown as IRequest<KardRewardsRegisterParams, {}, KardRewardsRegisterRequest>,
      },
    ];

    mockTestCases.forEach(async (mockRequest) => {
      try {
        const updatedCard = await registerInKardRewards(mockRequest.req);
        expect(updatedCard).toBeUndefined();
      } catch (e) {
        expect((e as Error).message).toEqual(mockRequest.expectedError);
      }
    });
  });
});
