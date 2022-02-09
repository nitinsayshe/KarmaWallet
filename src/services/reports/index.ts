import { asCustomError } from '../../lib/customError';
import { CardModel } from '../../models/card';
import { UserModel } from '../../models/user';
import { IRequest } from '../../types/request';

export const getSummary = async (_: IRequest) => {
  try {
    const totalUsersCount = await UserModel.find({}).count();
    const usersWithCards = await CardModel.distinct('userId').count();

    return {
      users: {
        total: totalUsersCount,
        withCard: usersWithCards,
        withoutCards: totalUsersCount - usersWithCards,
      },
    };
  } catch (err) {
    throw asCustomError(err);
  }
};
