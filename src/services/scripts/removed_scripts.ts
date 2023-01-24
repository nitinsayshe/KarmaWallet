import fs from 'fs';
import path from 'path';
import { UserModel } from '../../models/user';

export const checkRemovedCards = async () => {
  const removedCards = JSON.parse(fs.readFileSync(path.resolve(__dirname, './.tmp', 'removed_cards.json'), 'utf8'));
  const newData = [];

  for (const removedCard of removedCards) {
    const user = await UserModel.findOne({ _id: removedCard.id });

    if (!user) console.log(`[-] user not found: ${removedCard.id}`);

    if (!!user) {
      newData.push({
        name: user.name,
        _id: user._id,
      });
    }
  }

  fs.writeFileSync(path.resolve(__dirname, './.tmp', 'removedCardsUsers.json'), JSON.stringify(newData));
};
