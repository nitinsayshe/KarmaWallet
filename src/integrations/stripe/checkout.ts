import Stripe from 'stripe';
import { Checkout } from '../../clients/stripe/checkout';
import { StripeClient } from '../../clients/stripe/stripeClient';

// Instantiate the MarqetaClient
const stripeClient = new StripeClient();

// Instantiate the User class
const checkoutClient = new Checkout(stripeClient);

export const createCheckoutSession = async (params: Stripe.Checkout.SessionCreateParams) => {
  const response = await checkoutClient.createCheckoutSession(params);
  return response;
};
