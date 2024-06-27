import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { IUserProductSubscriptionCreation } from './types';
import { IUserProductSubscription, UserProductSubscriptionStatus } from '../../models/userProductSubscription/types';
import { InvoiceModel } from '../../models/invoice';
import { createInvoiceFromStripeInvoice, getInvoiceFromStripe } from '../../integrations/stripe/invoice';
import { UserProductSubscriptionModel } from '../../models/userProductSubscription';

dayjs.extend(utc);

export const createUserProductSubscription = async (data: IUserProductSubscriptionCreation) => {
  const userProductSubscriptionData: IUserProductSubscription = {
    user: data.user,
    expirationDate: dayjs().utc().add(1, 'year').toDate(),
    nextBillingDate: dayjs().utc().add(1, 'year').toDate(),
    lastBilledDate: dayjs().utc().toDate(),
    latestInvoice: null,
    status: UserProductSubscriptionStatus.UNPAID,
    productSubscription: data.productSubscription,
    createdOn: dayjs().utc().toDate(),
    lastModified: dayjs().utc().toDate(),
  };

  if (data.integrations.stripe) {
    userProductSubscriptionData.expirationDate = dayjs(data.integrations.stripe.current_period_end * 1000).utc().toDate();
    userProductSubscriptionData.nextBillingDate = dayjs(data.integrations.stripe.current_period_end * 1000).utc().toDate();
    userProductSubscriptionData.lastBilledDate = dayjs(data.integrations.stripe.current_period_start * 1000).utc().toDate();
    userProductSubscriptionData.status = data.integrations.stripe.status as UserProductSubscriptionStatus;
    userProductSubscriptionData.integrations = {
      ...data.integrations.stripe,
    };
    if (data.integrations.stripe.latest_invoice) {
      const internalInvoice = await InvoiceModel.findOne({ 'integrations.stripe.id': data.integrations.stripe.latest_invoice });
      if (!internalInvoice) {
        const stripeInvoice = await getInvoiceFromStripe(data.integrations.stripe.latest_invoice);
        const invoice = await createInvoiceFromStripeInvoice(stripeInvoice);
        userProductSubscriptionData.latestInvoice = invoice._id;
      }
    }
  }

  return UserProductSubscriptionModel.create(userProductSubscriptionData);
};
