import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { sectorsToExcludeFromTransactions } from '../../lib/constants/transaction';
import { TransactionModel } from '../../models/transaction';
import { IUserDocument } from '../../models/user';

dayjs.extend(utc);

export const getGroupMembersWithCardWithOffsets = async (date: Date) => {
  try {
    const res = await TransactionModel.aggregate([
      {
        $match: {
          'integrations.rare': { $exists: true },
          date: { $gte: date },
          sector: { $nin: sectorsToExcludeFromTransactions },
          amount: { $gt: 0 },
          reversed: { $ne: true },
        },
      }, {
        $project: {
          _id: 0,
          userId: 1,
        },
      }, {
        $group: {
          _id: 'something',
          ids: {
            $addToSet: '$user',
          },
        },
      }, {
        $lookup: {
          from: 'user_groups',
          localField: 'ids',
          foreignField: 'user',
          as: 'userGroups',
        },
      }, {
        $project: {
          _id: 0,
          userGroups: 1,
        },
      }, {
        $lookup: {
          from: 'users',
          localField: 'userGroups.user',
          foreignField: '_id',
          as: 'users',
        },
      }, {
        $project: {
          users: 1,
        },
      },
    ]);

    console.log(res[0].users.map((u: IUserDocument) => u.name));
  } catch (err) {
    console.log('>>>>> error getting group members with a card who have purchased an offset');
    console.log(err);
  }
};
