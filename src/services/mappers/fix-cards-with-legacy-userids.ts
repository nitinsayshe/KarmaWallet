import { ObjectId } from 'mongoose';
import { CardModel } from '../../models/card';
import { UserModel } from '../../models/user';

export const fixCardsWithLegacyUserIds = async () => {
  const cards = await CardModel.find({});

  for (const card of cards) {
    if (!card.userId) {
      const leanCard = await CardModel.findOne({ _id: card._id }).lean();
      const user = await UserModel.findOne({ legacyId: leanCard.userId });
      card.userId = user._id as unknown as ObjectId;
    }
  }
};
