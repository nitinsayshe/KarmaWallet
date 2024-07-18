import { unsubscribeContactFromLists } from '../../../integrations/activecampaign';
import { ProductSubscriptionType } from '../../../models/productSubscription/types';
import { ProductSubscriptionModel } from '../../../models/productSubscription';
import { IUserDocument } from '../../../models/user';
import { KarmaMembershipStatusEnum } from '../../../models/user/types';
import { IVisitorDocument } from '../../../models/visitor';
import { ActiveCampaignListId, MarketingSubscriptionCode, MarketingSubscriptionStatus } from '../../../types/marketing_subscription';
import { isUserDocument, getEmailFromUserOrVisitor } from '../../user/utils';
import { getUtcDate } from '../../../lib/date';
import { MarketingSubscriptionModel } from '../../../models/marketingSubscription';

export const isFreeMembershipUser = async (user: IUserDocument) => {
  try {
    if (!user?.karmaMembership?.status
    || user?.karmaMembership?.status !== KarmaMembershipStatusEnum.active
    || !user?.karmaMembership?.productSubscription) return false;

    const productSubscription = await ProductSubscriptionModel.findById(user.karmaMembership.productSubscription);
    return !!productSubscription && productSubscription.type === ProductSubscriptionType.KARMAWALLET;
  } catch (err) {
    console.error('Error checking if user is a free membership user', err);
    return false;
  }
};

export const updateUserSubscriptions = async (user: string, subscribe: Array<MarketingSubscriptionCode>, unsubscribe: Array<MarketingSubscriptionCode>) => {
  if (subscribe?.length > 0) {
    await Promise.all(
      subscribe.map(async (code) => {
        await MarketingSubscriptionModel.findOneAndUpdate(
          { user, code },
          {
            user,
            code,
            lastModified: getUtcDate(),
            status: MarketingSubscriptionStatus.Active,
          },
          { upsert: true },
        );
      }),
    );
  }

  if (unsubscribe?.length > 0) {
    await MarketingSubscriptionModel.updateMany(
      { user, code: { $in: unsubscribe } },
      { lastModified: getUtcDate(), status: MarketingSubscriptionStatus.Cancelled },
    );
  }
};

export const updateVisitorSubscriptions = async (visitor: string, subscribe: Array<MarketingSubscriptionCode>, unsubscribe: Array<MarketingSubscriptionCode>) => {
  if (subscribe?.length > 0) {
    await Promise.all(
      subscribe.map(async (code) => {
        await MarketingSubscriptionModel.findOneAndUpdate(
          { visitor, code },
          {
            visitor,
            code,
            lastModified: getUtcDate(),
            status: MarketingSubscriptionStatus.Active,
          },
          { upsert: true },
        );
      }),
    );
  }

  if (unsubscribe?.length > 0) {
    await MarketingSubscriptionModel.updateMany(
      { visitor, code: { $in: unsubscribe } },
      { lastModified: getUtcDate(), status: MarketingSubscriptionStatus.Cancelled },
    );
  }
};

export const removeUserFromDebitCardHoldersList = async (entity: IUserDocument | IVisitorDocument) => {
  const isUser = isUserDocument(entity);
  const entityId = entity._id.toString();
  await unsubscribeContactFromLists(getEmailFromUserOrVisitor(entity), [ActiveCampaignListId.DebitCardHolders]);
  if (isUser) await updateUserSubscriptions(entityId, [], [MarketingSubscriptionCode.debitCardHolders]);
  else await updateVisitorSubscriptions(entityId, [], [MarketingSubscriptionCode.debitCardHolders]);
};
