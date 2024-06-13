import Stripe from 'stripe';
import { Checkout } from '../../clients/stripe/checkout';
import { StripeClient } from '../../clients/stripe/stripeClient';
import { MembershipPromoModel } from '../../models/membershipPromo';
import { IUrlParam } from '../../models/user/types';
import { ICheckoutSessionParams } from './types';

export const createCheckoutSession = async (params: Stripe.Checkout.SessionCreateParams) => {
  const stripeClient = new StripeClient();
  const checkoutClient = new Checkout(stripeClient);
  const response = await checkoutClient.createCheckoutSession(params);
  return response;
};

export const retrieveCheckoutSession = async (checkoutSessionId: string) => {
  const stripeClient = new StripeClient();
  const checkoutClient = new Checkout(stripeClient);
  const response = await checkoutClient.retrieveCheckoutSession(checkoutSessionId);
  return response;
};

export const createKarmaCardMembershipCustomerSession = async (params: ICheckoutSessionParams): Promise<Stripe.Checkout.Session> => {
  const { user, productPrice, uiMode } = params;

  if (!user) throw new Error('User not found');
  let promoCode = '';

  const membershipPromoCode = user.integrations?.referrals?.params.find((referral: IUrlParam) => referral.key === 'membershipPromoCode');
  if (membershipPromoCode) {
    const membershipPromoDocument = await MembershipPromoModel.findOne({ code: membershipPromoCode });
    if (!membershipPromoDocument) console.log('///// no promo code found for this value');
    else promoCode = membershipPromoDocument.integrations.stripe.id;
  }

  const stripeCustomerID = user.integrations.stripe.id;
  if (!stripeCustomerID) throw new Error('Stripe customer ID not found');
  // check the uyser for promo codes and find the id fopr the promo code in our promo collection
  // add it to the checkout session if there is a matching one
  //
  const stripeData: Stripe.Checkout.SessionCreateParams = {
    ui_mode: uiMode || 'hosted',
    line_items: [
      {
        // defaults to the Standard Karma Card Membership price
        price: productPrice || 'price_1PJIiMFvwRyik3wAWneIxPQX',
        quantity: 1,
      },
    ],
    customer: stripeCustomerID,
    client_reference_id: user._id.toString(),
    mode: 'subscription',
    // do we want to add a cancel_url?
  };

  if (!!promoCode) stripeData.discounts = [{ promotion_code: promoCode }];
  if (uiMode === 'hosted') {
    stripeData.success_url = 'https://karmawallet.io/karma-card/membership?success=true';
  } else {
    stripeData.redirect_on_completion = 'never';
  }
  const newSession = await createCheckoutSession(stripeData);
  console.log('///// new session', newSession.client_secret);
  return newSession;
};
