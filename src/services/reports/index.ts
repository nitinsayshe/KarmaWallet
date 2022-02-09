import { asCustomError } from '../../lib/customError';
import { CardModel } from '../../models/card';
import { TransactionModel } from '../../models/transaction';
import { UserModel } from '../../models/user';
import { IRequest } from '../../types/request';

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
