import Stripe from 'stripe';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { UserModel } from '../../models/user';
import { asCustomError } from '../../lib/customError';
import { UserProductSubscriptionModel } from '../../models/userProductSubscription';
import { ProductSubscriptionModel } from '../../models/productSubscription';
import { UserProductSubscriptionStatus } from '../../models/userProductSubscription/types';
import { InvoiceModel } from '../../models/invoice';
import { StripeClient } from '../../clients/stripe/stripeClient';
import { Subscription } from '../../clients/stripe/subscription';

dayjs.extend(utc);

const getSubscriptionStatusFromStripeStatus = (status: Stripe.Subscription.Status) => {
  switch (status) {
    case 'active':
      return UserProductSubscriptionStatus.ACTIVE;
    case 'canceled':
      return UserProductSubscriptionStatus.CANCELLED;
    case 'incomplete':
      return UserProductSubscriptionStatus.PAUSED;
    case 'incomplete_expired':
      return UserProductSubscriptionStatus.INCOMPLETE_EXPIRED;
    case 'past_due':
      return UserProductSubscriptionStatus.PAST_DUE;
    case 'trialing':
      return UserProductSubscriptionStatus.TRIALING;
    case 'unpaid':
      return UserProductSubscriptionStatus.UNPAID;
    default:
      return UserProductSubscriptionStatus.PAUSED;
  }
};

export const createUserProductSubscriptionFromStripeSubscription = async (data: Stripe.CustomerSubscriptionCreatedEvent.Data) => {
  // create a user product subscription
  console.log('///// event data', data);
  const user = await UserModel.findOne({ 'integrations.stripe.id': data.object.customer });
  if (!user) throw asCustomError(new Error('Error creating user product subscription, user not found.'));
  const product = await ProductSubscriptionModel.findOne({ 'integrations.stripe.id': data.object.items.data[0].price.product });
  const invoice = await InvoiceModel.findOne({ 'integrations.stripe.id': data.object.latest_invoice });
  // create a user product subscription
  const rightNow = dayjs().utc().toDate();
  const statusForSubscription = getSubscriptionStatusFromStripeStatus(data.object.status);
  console.log('///// statusForSubscription', statusForSubscription);
  const userProductSubscription = await UserProductSubscriptionModel.create({
    user: user._id,
    expirationDate: dayjs().utc().add(1, 'year').toDate(),
    nextBillingDate: dayjs().utc().add(1, 'year').toDate(),
    lastBilledDate: rightNow,
    latestInvoice: invoice?._id || null,
    integrations: {
      stripe: {
        ...data.object,
      },
    },
    status: getSubscriptionStatusFromStripeStatus(data.object.status),
    productSubscription: product,
  });

  return userProductSubscription;
};

export const updateUserProductSubscriptionFromStripeSubscription = async (data: Stripe.CustomerSubscriptionUpdatedEvent.Data) => {
  try {
    const stripeClient = new StripeClient();
    const checkoutClient = new Subscription(stripeClient);
    const currentSubscriptionData = await checkoutClient.getSubscriptionById(data.object.id);
    const existingProductSubscription = await UserProductSubscriptionModel.findOne({ 'integrations.stripe.id': data.object.id });
    const invoice = await InvoiceModel.findOne({ 'integrations.stripe.id': currentSubscriptionData.latest_invoice });
    console.log('////// found exisitng', existingProductSubscription._id);
    console.log('///// from stripe', currentSubscriptionData);
    existingProductSubscription.latestInvoice = invoice?._id || null;
    existingProductSubscription.nextBillingDate = dayjs(currentSubscriptionData.current_period_end * 1000).utc().toDate();
    existingProductSubscription.lastBilledDate = dayjs(currentSubscriptionData.current_period_start * 1000).utc().toDate();
    existingProductSubscription.lastModified = dayjs().utc().toDate();
    existingProductSubscription.integrations = {
      stripe: currentSubscriptionData,
    };
    existingProductSubscription.status = getSubscriptionStatusFromStripeStatus(currentSubscriptionData.status);
    await existingProductSubscription.save();
    return existingProductSubscription;
  } catch (err) {
    console.log('///// error updating user product subscription', err);
    throw asCustomError(err);
  }
};
