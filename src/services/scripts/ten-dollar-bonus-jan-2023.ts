import 'dotenv/config';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { emailIds } from './emailIds';
import { CardModel } from '../../models/card';
import { UserModel } from '../../models/user';
import { CardStatus } from '../../lib/constants';

dayjs.extend(utc);

// get users with a dateJoined after startDate and before endDate
// get cards $in these ids
// get unique userIds in these cards

export const getFacebookBonusUsers = async (startDate: string, endDate: string) => {
  const users = await UserModel.find({ dateJoined: { $gte: dayjs(startDate).utc().toDate(), $lt: dayjs(endDate).utc().toDate() } }).select('name emails');
  const userIds = users.map((user) => user._id);
  const cards = await CardModel.find({ userId: { $in: userIds }, status: CardStatus.Linked });
  const uniqueIds: string[] = [];
  cards.forEach(card => {
    if (!uniqueIds.includes(card.userId.toString())) {
      uniqueIds.push(card.userId.toString());
    }
  });
  // console.log('cards', JSON.stringify(cards.map(c => c._id.toString())));
  // console.log('users', JSON.stringify(uniqueIds));
  return { users: uniqueIds, numberOfUsers: uniqueIds.length };
};

// iterate over all userIds from the emailIds array
// get all cards that are linked for userId
// if card is found for user make sure it has a createdOn date that is after the startDate and before the endDate
// return uniqueIds for these users (push onto array)

export const getBonusUsersFromEmailCampaign = async (startDate: string, endDate: string) => {
  const uniqueIds = [];
  for (const userId of emailIds) {
    const cards = await CardModel.find({ userId, status: CardStatus.Linked });
    if (cards.length > 0) {
      for (const card of cards) {
        if (card.createdOn >= dayjs(startDate).utc().toDate() && card.createdOn <= dayjs(endDate).utc().toDate()) {
          uniqueIds.push(userId);
          break;
        }
      }
    }
  }
  return { users: uniqueIds, numberOfUsers: uniqueIds.length };
};
