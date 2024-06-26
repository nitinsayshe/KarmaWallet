import Stripe from 'stripe';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { UserModel } from '../../models/user';
import { asCustomError } from '../../lib/customError';
import { UserProductSubscriptionModel } from '../../models/userProductSubscription';
import { ProductSubscriptionModel } from '../../models/productSubscription';
import { UserProductSubscriptionStatus } from '../../models/userProductSubscription/types';
import { InvoiceModel } from '../../models/invoice';

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
    const invoice = await InvoiceModel.findOne({ 'integrations.stripe.id': data.object?.latest_invoice });
    const existingProductSubscription = await UserProductSubscriptionModel.findOne({ 'integration.stripe.id': data.object.id });
    existingProductSubscription.latestInvoice = invoice?._id || null;
    existingProductSubscription.nextBillingDate = dayjs(data.object.current_period_end * 1000).utc().toDate();
    existingProductSubscription.lastBilledDate = dayjs(data.object.current_period_start * 1000).utc().toDate();
    existingProductSubscription.lastModified = dayjs().utc().toDate();
    existingProductSubscription.integrations = {
      stripe: data.object,
    };
    existingProductSubscription.status = getSubscriptionStatusFromStripeStatus(data.object.status);
    await existingProductSubscription.save();
    return existingProductSubscription;
  } catch (err) {
    console.log('///// error updating user product subscription', err);
    throw asCustomError(err);
  }
};
