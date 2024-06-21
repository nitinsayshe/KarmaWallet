import Stripe from 'stripe';
import { Checkout } from '../../clients/stripe/checkout';
import { StripeClient } from '../../clients/stripe/stripeClient';

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
