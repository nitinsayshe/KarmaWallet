import 'dotenv/config';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { MongoClient } from '../src/clients/mongo';
import { CardModel } from '../src/models/card';
import { CardStatus } from '../src/lib/constants';

dayjs.extend(utc);

/* WARNING: This should not be run when connected to the production database. */

const userId = ''; // userId to associate with the cards
(async () => {
  try {
    await MongoClient.init();

    // get two months ago in UTC
    const twoMonthsAgo = dayjs().subtract(2, 'month').utc().startOf('day')
      .toDate();

    // for each day insert ine unliked card
    // if the day is divisible by 2, 5, or 10 insert a removed card
    const diffDays = dayjs().utc().diff(twoMonthsAgo, 'day');
    const days: Date[] = [];
    for (let i = 0; i < diffDays; i += 1) {
      const date = dayjs(twoMonthsAgo).add(i, 'day').toDate();
      days.push(date);
    }

    const createdDays = await Promise.all(days.map(async (date) => {
      console.log('adding cards for date: ', date);
      if (date.getDay() % 2 === 0) {
        return CardModel.create({
          userId,
          removedDate: date,
          lastModified: date,
          status: CardStatus.Removed,
        });
      }
      if (date.getDay() % 5 === 0) {
        return CardModel.create({
          userId,
          removedDate: date,
          lastModified: date,
          status: CardStatus.Removed,
        });
      }
      if (date.getDay() % 10 === 0) {
        return CardModel.create({
          userId,
          removedDate: date,
          lastModified: date,
          status: CardStatus.Removed,
        });
      }
      await CardModel.create({
        userId,
        unlinkedDate: date,
        lastModified: date,
        status: CardStatus.Unlinked,
      });
    }));
    console.log('createdDays: ', createdDays);
  } catch (err) {
    console.log(err);
  } finally {
    MongoClient.disconnect();
  }
})();
