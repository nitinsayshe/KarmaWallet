import Stripe from 'stripe';
import { StripeClient } from '../../clients/stripe/stripeClient';
import { Customer } from '../../clients/stripe/customer';
import { IUserDocument, UserModel } from '../../models/user';

export const createStripeCustomer = async (email: string, name: string) => {
  const stripeClient = new StripeClient();
  const customerClient = new Customer(stripeClient);
  const response = await customerClient.createCustomer(email, name);
  return response;
};

export const addStripeIntegrationToUser = async (customer: Stripe.Customer) => {
  try {
    const { email } = customer;
    const KWUser = await UserModel.findOne({ 'emails.email': email });
    if (!KWUser) {
      throw new Error(`Could not add Stripe integration to user, user with ${email} email not found.`);
    }

    KWUser.integrations.stripe = customer;
    await KWUser.save();
  } catch (err) {
    throw new Error(`Could not add Stripe integration to user: ${err}`);
  }
};

export const updateStripeIntegrationForUser = async (customer: Stripe.Customer) => {
  try {
    const user = await UserModel.findOne({ 'integrations.stripe.id': customer.id });
    if (!user) {
      throw new Error(`Could not update Stripe integration for user, user with ${customer.id} not found.`);
    }

    user.integrations.stripe = customer;
    await user.save();
  } catch (err) {
    throw new Error(`Could not update Stripe integration for user: ${err}`);
  }
};

export const createStripeCustomerAndAddToUser = async (user: IUserDocument) => {
  const primaryEmail = user.emails.find(e => e.primary === true).email;
  const customer = await createStripeCustomer(primaryEmail, user.name);
  await addStripeIntegrationToUser(customer);
  return customer;
};
