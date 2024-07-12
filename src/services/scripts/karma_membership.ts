import { PaginateResult } from 'mongoose';
import { IUserDocument } from '../../models/user';
import { iterateOverUsersAndExecWithDelay, UserIterationRequest, UserIterationResponse } from '../user/utils';
import { getUtcDate } from '../../lib/date';
import { IKarmaMembershipData, KarmaMembershipStatusEnum } from '../../models/user/types';
import { InvoiceModel } from '../../models/invoice';
import { InvoiceStatus } from '../../models/invoice/types';
import { sleep } from '../../lib/misc';
import { ProductSubscriptionType } from '../../models/productSubscription/types';
import { UserProductSubscriptionModel } from '../../models/userProductSubscription/index';
import { ProductSubscriptionModel } from '../../models/productSubscription/index';
import { IMarqetaUserStatus } from '../../integrations/marqeta/user/types';
import { getStripeCustomerForUser, createStripeCustomerAndAddToUser } from '../../integrations/stripe/customer';

export const backfillKarmaMembershipStatus = async () => {
  try {
    const msDelayBetweenBatches = 500;
    const req = {
      batchQuery: { 'integrations.marqeta': { $exists: true }, 'integrations.marqeta.status': IMarqetaUserStatus.ACTIVE },
      batchLimit: 100,
    };

    const karmaMembershipProductSubscription = await ProductSubscriptionModel.findOne({
      type: ProductSubscriptionType.KARMAWALLET,
    });
    await iterateOverUsersAndExecWithDelay(
      req,
      async (_: UserIterationRequest<{}>, userBatch: PaginateResult<IUserDocument>): Promise<UserIterationResponse<{}>[]> => {
        for (const user of userBatch.docs) {
          try {
            console.log(`subscribing user ${user._id}, ${user.emails.find((e) => e.primary)?.email} to karma membership`);
            console.log('user marqeta status', user.integrations.marqeta.status);

            let invoice = await InvoiceModel.findOne({ user: user._id, status: InvoiceStatus.paid });
            if (!invoice?._id) {
              // add invoice marked as paid
              invoice = await InvoiceModel.create({
                amount: 0,
                status: InvoiceStatus.paid,
                user: user?._id,
                integrations: {
                },
              });
            }

            let productSubscription = await UserProductSubscriptionModel.findOne({
              user: user._id,
              productSubscription: karmaMembershipProductSubscription?._id,
            });
            if (!productSubscription?._id) {
              // create one
              productSubscription = await UserProductSubscriptionModel.create({
                user: user._id,
                expirationDate: getUtcDate().add(1, 'year').toDate(),
                lastModified: getUtcDate().toDate(),
                nextBillingDate: getUtcDate().add(1, 'year').toDate(),
                status: KarmaMembershipStatusEnum.active,
                latestInvoice: invoice._id,
                type: ProductSubscriptionType.KARMAWALLET,
                productSubscription: karmaMembershipProductSubscription?._id,
                integrations: {
                },
              });
            } else {
              productSubscription.latestInvoice = invoice._id;
              await productSubscription.save();
            }
            console.log(`using product subscription ${productSubscription._id} for user ${user._id}`);
            console.log(productSubscription);

            // add user subscription
            const karmaMembership: IKarmaMembershipData = {
              productSubscription: karmaMembershipProductSubscription,
              status: KarmaMembershipStatusEnum.active,
              lastModified: getUtcDate().toDate(),
              startDate: getUtcDate().toDate(),
            };

            user.karmaMembership = karmaMembership;

            await user.save();
            console.log(`using subscription ${user.karmaMembership} for user ${user._id}`);
            console.log(user.karmaMembership);

            console.log(`created invoice ${invoice._id} for user ${user._id}`);
            console.log(invoice);
            console.log(`created subscription ${user.karmaMembership} for user ${user._id}`);

            // create stripe user for theuser if one doesn't already exist
            const stripeCustomer = await getStripeCustomerForUser(user);
            if (!stripeCustomer?.id) {
              await createStripeCustomerAndAddToUser(user);
            }
            await sleep(1000);
          } catch (err) {
            console.error(`Error saving user: ${err}`);
          }
        }

        return userBatch.docs.map((user: IUserDocument) => ({
          userId: user._id,
        }));
      },
      msDelayBetweenBatches,
    );
  } catch (err) {
    console.error(err);
  }
};
