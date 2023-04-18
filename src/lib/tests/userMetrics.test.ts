import { afterAll, afterEach, beforeAll, describe, expect, it } from '@jest/globals';
import dayjs from 'dayjs';
import { MongoClient } from '../../clients/mongo';
import { ICardDocument } from '../../models/card';
import { IUserDocument } from '../../models/user';
import { CardStatus } from '../constants';
import { createSomeCards, createSomeUsers, CreateTestCardsRequest } from '../testingUtils';
import { getUsersWithUnlinkedOrRemovedAccountsPastThirtyDays } from '../userMetrics';

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
    await Promise.all(testCards.map(async (card) => card.remove()));

    await testUser.remove();
    await testUserWithRemovedCard.remove();
    await testUserWithRemovedCards.remove();
    await testUserWithUnlinkedCard.remove();
    await testUserWithUnlinkedCards.remove();
    await testUserWithUnlinkedCardTwoMonthsAgo.remove();

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
    console.log('created test users', testUser);

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
    console.log('created test cards', JSON.stringify(testCards, null, 2));
  });

  it('usersWithUnlinkedOrRemovedAccountsPastThirtyDays retrieves all users that have unlinked or removed a card', async () => {
    const userIds = await getUsersWithUnlinkedOrRemovedAccountsPastThirtyDays();
    const unlinkedOrRemovedUserIds = [
      testUserWithRemovedCard._id,
      testUserWithRemovedCards._id,
      testUserWithUnlinkedCard._id,
      testUserWithUnlinkedCards._id,
    ];
    expect(userIds?.length).toBe(4);
    userIds.forEach((userId) => {
      expect(unlinkedOrRemovedUserIds).toContainEqual(userId);
    });
  });
});
