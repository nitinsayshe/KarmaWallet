import Stripe from 'stripe';
import { Checkout } from '../../clients/stripe/checkout';
import { StripeClient } from '../../clients/stripe/stripeClient';
import { IUserDocument } from '../../models/user';
import { MembershipPromoModel } from '../../models/membershipPromo';

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

export const createKarmaCardMembershipCustomerSession = async (
  user: IUserDocument,
  productPrice?: string,
  uiMode?: Stripe.Checkout.SessionCreateParams.UiMode,
) => {
  if (!user) throw new Error('User not found');
  let promoCode = '';

  const membershipPromoCode = user.integrations?.referrals?.params.find((referral) => referral.key === 'membershipPromoCode');
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
    success_url: 'https://karmawallet.io',
    // do we want to add a cancel_url?
  };

  if (!!promoCode) stripeData.discounts = [{ promotion_code: promoCode }];
  const newSession = await createCheckoutSession(stripeData);
  return newSession;
};
