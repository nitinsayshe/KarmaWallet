import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { asCustomError } from '../../lib/customError';
import { CardModel } from '../../models/card';
import { TransactionModel } from '../../models/transaction';
import { UserModel } from '../../models/user';
import { IRequest } from '../../types/request';

dayjs.extend(utc);

export const getAllReports = async (_: IRequest) => {
  console.log('>>>>> getting all reports');

  return [
    {
      _id: 'abc123',
      // a unique key for FE and BE to identify this report by.
      // this shuld not change once set
      reportId: 'user-signups',
      name: 'User Signups',
      description: 'A breakdown of user signups per day.',
      lastUpdated: dayjs().utc().toDate(),
    },
    {
      _id: 'def456',
      // a unique key for FE and BE to identify this report by.
      // this shuld not change once set
      reportId: 'carbon-offsets',
      name: 'Carbon Offsets',
      description: 'A breakdown of user carbon offset purchases per day.',
      lastUpdated: dayjs().utc().toDate(),
    },
  ];
};

export const getSummary = async (_: IRequest) => {
  try {
    const totalUsersCount = await UserModel.find({}).count();
    const cards = await CardModel.find({});
    const transactions = await TransactionModel.find({}).count();
    const usersWithCards = new Set();

    for (const card of cards) {
      if (!usersWithCards.has(card.userId.toString())) {
        usersWithCards.add(card.userId.toString());
      }
    }

    return {
      users: {
        total: totalUsersCount,
        withCard: usersWithCards.size,
        withoutCard: totalUsersCount - usersWithCards.size,
      },
      cards: {
        total: cards.length,
      },
      transactions: {
        total: transactions,
      },
    };
  } catch (err) {
    throw asCustomError(err);
  }
};
