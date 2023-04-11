import { Types } from 'mongoose';
import { CardStatus } from '../../lib/constants';
import { CardModel } from '../../models/card';
import { UserModel } from '../../models/user';

export const getPromoData = async (promoId: string) => {
  const usersInPromo = await UserModel.find({ 'integrations.promos': new Types.ObjectId(promoId) });
  let promoUsersWithCard = 0;
  const campaignData: any = {};
  const sourcesData: any = {};
  console.log(`There are ${usersInPromo.length} users in this promo`);

  for (const user of usersInPromo) {
    const userCards = await CardModel.find({ userId: user._id, status: CardStatus.Linked });

    if (user.integrations?.referrals?.params.length > 0) {
      const campaigns = user.integrations?.referrals?.params.filter((p) => p.key === 'utm_campaign');

      for (const campaign of campaigns) {
        if (campaignData[campaign.value]) {
          campaignData[campaign.value] += 1;
        } else {
          campaignData[campaign.value] = 1;
        }
      }

      const sources = user.integrations?.referrals?.params.filter((p) => p.key === 'utm_source');

      for (const source of sources) {
        if (sourcesData[source.value]) {
          sourcesData[source.value] += 1;
        } else {
          sourcesData[source.value] = 1;
        }
      }
    }

    if (userCards.length > 0) {
      promoUsersWithCard += 1;
    }
  }

  console.log(`There are ${promoUsersWithCard} users with cards in this promo`);
  console.log('Campaigns:', campaignData);
  console.log('Sources:', sourcesData);
};
