import Stripe from 'stripe';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { Promo } from '../../clients/stripe/promo';
import { StripeClient } from '../../clients/stripe/stripeClient';
import { MembershipPromoModel } from '../../models/membershipPromo';
import { IShareableMembershipPromo } from '../../models/membershipPromo/types';
import { addMembershipPromoToDatabase } from '../../services/membershipPromo';

dayjs.extend(utc);

export const listPromos = async (numberToList?: number) => {
  const stripeClient = new StripeClient();
  const promoClient = new Promo(stripeClient);
  const response = await promoClient.listPromos(numberToList || 100);
  return response;
};

export const createMembershipPromoFromStripePromo = async (promo: Stripe.PromotionCode) => {
  const createdDate = new Date(promo.created * 1000);

  const newMembershipPromoData: IShareableMembershipPromo = {
    status: promo.active ? 'active' : 'inactive',
    code: promo.code,
    createdOn: createdDate,
    lastModified: createdDate,
    expiresOn: new Date(promo.expires_at * 1000),
    integrations: {
      stripe: promo,
    },
  };

  const newItem = await addMembershipPromoToDatabase(newMembershipPromoData);
  return newItem;
};

export const updateMembershipPromoFromStripePromo = async (promo: Stripe.PromotionCode) => {
  const updatedMembershipPromoData: Partial<IShareableMembershipPromo> = {
    status: promo.active ? 'active' : 'inactive',
    lastModified: await dayjs().utc().toDate(),
    expiresOn: new Date(promo.expires_at * 1000),
  };

  const existingPromo = await MembershipPromoModel.findOne({ 'integrations.stripe.id': promo.id });
  if (!existingPromo) {
    throw new Error('Promo not found');
  }

  existingPromo.status = updatedMembershipPromoData.status;
  existingPromo.lastModified = updatedMembershipPromoData.lastModified;
  existingPromo.expiresOn = updatedMembershipPromoData.expiresOn;
  existingPromo.integrations.stripe = promo;
  const updatedPromo = await existingPromo.save();
  return updatedPromo;
};

export const syncPromosFromStripeToMembershipPromosCollection = async () => {
  const promos = await listPromos();
  if (!promos) {
    throw new Error('No promos found');
  }

  // loop through the promos and add them to the membership promos collection
  for (const promo of promos.data) {
    // check if the promo exists in the membership promos collection
    const existingPromo = await MembershipPromoModel.findOne({ 'integrations.stripe.id': promo.id });

    if (existingPromo) {
      await updateMembershipPromoFromStripePromo(promo);
    } else {
      console.log('///// Creating a new Membership promo from Stripe promo', promo.id);
      await createMembershipPromoFromStripePromo(promo);
    }
  }
};
