import path from 'path';
import fs from 'fs';
import { parse } from 'json2csv';
import { CardModel } from '../../models/card';
import { UserModel } from '../../models/user';

export const getUsersWithRemovedCards = async () => {
  const removedCards = await CardModel.find({ status: 'removed' });
  const usersWithRemovedCards: any = [];

  for (const card of removedCards) {
    const existingUser = usersWithRemovedCards.find((user: any) => user?.id?.toString() === card?.userId?.toString());
    if (!existingUser) {
      const userInfo = await UserModel.findById(card.userId);
      if (!userInfo) continue;
      usersWithRemovedCards.push({
        name: userInfo?.name,
        id: userInfo?._id.toString(),
      });
    }
  }

  const _csv = parse(usersWithRemovedCards);
  fs.writeFileSync(path.join(__dirname, '.tmp', 'users_removed_cards.csv'), _csv);
};
