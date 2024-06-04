import { MembershipPromoModel } from '../../models/membershipPromo';
import { IShareableMembershipPromo } from '../../models/membershipPromo/types';

export const addMembershipPromoToDatabase = async (promo: IShareableMembershipPromo) => {
  const promoModel = new MembershipPromoModel(promo);
  return promoModel.save();
};
