import Stripe from 'stripe';
import { Checkout } from '../../clients/stripe/checkout';
import { StripeClient } from '../../clients/stripe/stripeClient';
import { UserModel } from '../../models/user';

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

export const createKarmaCardMembershipCustomerSession = async (userId: string, productPrice?: string, uiMode?: Stripe.Checkout.SessionCreateParams.UiMode) => {
  const user = await UserModel.findById(userId);
  if (!user) throw new Error('User not found');
  const stripeCustomerID = user.integrations.stripe.id;
  if (!stripeCustomerID) throw new Error('Stripe customer ID not found');

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
    client_reference_id: userId,
    mode: 'subscription',
    success_url: 'https://karmawallet.io',
    allow_promotion_codes: true,
    // do we want to add a cancel_url?
  };

  const newSession = await createCheckoutSession(stripeData);
  return newSession;
};
