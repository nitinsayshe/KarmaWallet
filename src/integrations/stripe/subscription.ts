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
  const user = await UserModel.findOne({ 'integrations.stripe.id': data.object.customer });
  if (!user) throw asCustomError(new Error('Error creating user product subscription, user not found.'));
  const product = await ProductSubscriptionModel.findOne({ 'integrations.stripe.id': data.object.items.data[0].price.product });
  const invoice = await InvoiceModel.findOne({ 'integrations.stripe.id': data.object.latest_invoice });
  // create a user product subscription
  const userProductSubscription = await UserProductSubscriptionModel.create({
    user: user._id,
    nextBillingDate: dayjs(data.object.current_period_end).utc().toDate(),
    lastBilledDate: dayjs(data.object.current_period_start).utc().toDate(),
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

// export const createSubscription = async (user: IUserDocument, product: IProductSubscription) => {
//   // const customerId = user.integrations.stripe.id;
//   // const productId = product.integrations.stripe.id;

//   // const stripeClient = new StripeClient();
//   // const subscriptionClient = new Subscription(stripeClient);
//   // await subscriptionClient.createSubscription({
//   //   customer: customerId,
//   //   current_period_start: dayjs().utc().unix(),
//   //   current_period_end: dayjs().add(1, 'year').utc().unix(),
//   //   items: [
//   //     {
//   //       price: productId,
//   //     },
//   //   ],
//   // });
// };

export const updateUserProductSubscriptionFromStripeSubscription = async (data: Stripe.CustomerSubscriptionUpdatedEvent.Data) => {
  // update the user product subscription
  const userProductSubscription = await UserProductSubscriptionModel.findOne({ 'integration.stripe.id': data.object.id });
  if (!userProductSubscription) throw asCustomError(new Error('Error updating user product subscription, subscription not found.'));
  const invoice = await InvoiceModel.findOne({ 'integrations.stripe.id': data.object.latest_invoice });
  userProductSubscription.nextBillingDate = dayjs(data.object.current_period_end).utc().toDate();
  userProductSubscription.lastBilledDate = dayjs(data.object.current_period_start).utc().toDate();
  userProductSubscription.latestInvoice = invoice?._id || null;
  userProductSubscription.integrations.stripe = data.object;
  userProductSubscription.status = getSubscriptionStatusFromStripeStatus(data.object.status);
  await userProductSubscription.save();
  return userProductSubscription;
};
