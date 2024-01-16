import { afterAll, afterEach, beforeAll, describe, expect, it } from '@jest/globals';
import dayjs from 'dayjs';
import { getUsersWithUnlinkedOrRemovedAccountsPastThirtyDays } from '../metrics';
import { MongoClient } from '../../../../clients/mongo';
import { CardStatus } from '../../../../lib/constants';
import { ICardDocument } from '../../../../models/card';
import { IUserDocument } from '../../../../models/user';
import {
  createSomeUsers,
  CreateTestCardsRequest,
  createSomeCards,
} from '../../../../lib/testingUtils';
import { cleanUpDocuments } from '../../../../lib/model';

describe('active campaign sync jobs logic', () => {
  let testUser: IUserDocument;
  let testUserWithRemovedCard: IUserDocument;
  let testUserWithRemovedCards: IUserDocument;
  let testUserWithUnlinkedCard: IUserDocument;
  let testUserWithUnlinkedCards: IUserDocument;
  let testUserWithUnlinkedCardTwoMonthsAgo: IUserDocument;
  let testCards: ICardDocument[];

  afterEach(() => {
    /* clean up between tests */
  });

  afterAll(async () => {
    // clean up db
    await cleanUpDocuments([
      ...testCards,
      testUser,
      testUserWithRemovedCard,
      testUserWithRemovedCards,
      testUserWithUnlinkedCard,
      testUserWithUnlinkedCards,
      testUserWithUnlinkedCardTwoMonthsAgo,
    ]);

    MongoClient.disconnect();
  });

  beforeAll(async () => {
    await MongoClient.init();

    [
      testUserWithUnlinkedCard,
      testUserWithUnlinkedCards,
      testUserWithRemovedCard,
      testUserWithRemovedCards,
      testUserWithUnlinkedCardTwoMonthsAgo,
      testUser,
    ] = await createSomeUsers({ users: [{}, {}, {}, {}, {}, {}] });

    const createCardsReq: CreateTestCardsRequest = {
      cards: [
        {
          userId: testUserWithUnlinkedCard._id,
          status: CardStatus.Unlinked,
          unlinkedDate: dayjs().subtract(1, 'day').utc().toDate(),
        },
        {
          userId: testUserWithUnlinkedCards._id,
          status: CardStatus.Unlinked,
          unlinkedDate: dayjs().subtract(2, 'day').utc().toDate(),
        },
        {
          userId: testUserWithUnlinkedCards._id,
          status: CardStatus.Unlinked,
          unlinkedDate: dayjs().subtract(7, 'day').utc().toDate(),
        },
        {
          userId: testUserWithRemovedCard._id,
          status: CardStatus.Removed,
          removedDate: dayjs().subtract(1, 'day').utc().toDate(),
        },
        {
          userId: testUserWithRemovedCards._id,
          status: CardStatus.Removed,
          removedDate: dayjs().subtract(2, 'day').utc().toDate(),
        },
        {
          userId: testUserWithRemovedCards._id,
          status: CardStatus.Removed,
          removedDate: dayjs().subtract(7, 'day').utc().toDate(),
        },
        {
          userId: testUserWithUnlinkedCardTwoMonthsAgo._id,
          status: CardStatus.Unlinked,
          unlinkedDate: dayjs().subtract(2, 'month').utc().toDate(),
        },
      ],
    };
    testCards = await createSomeCards(createCardsReq);
  });

  it('usersWithUnlinkedOrRemovedAccountsPastThirtyDays retrieves all users that have unlinked or removed a card', async () => {
    const userIds = await getUsersWithUnlinkedOrRemovedAccountsPastThirtyDays();
    const unlinkedOrRemovedUserIds = [
      testUserWithRemovedCard._id,
      testUserWithRemovedCards._id,
      testUserWithUnlinkedCard._id,
      testUserWithUnlinkedCards._id,
    ];
    expect(userIds?.length).toBeGreaterThanOrEqual(4);
    unlinkedOrRemovedUserIds.forEach((userId) => {
      expect(userIds).toContainEqual(userId);
    });
  });
});
