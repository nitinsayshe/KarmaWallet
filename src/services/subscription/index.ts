import { updateActiveCampaignListStatus } from '../../integrations/activecampaign';
import { getUtcDate } from '../../lib/date';
import { SubscriptionModel } from '../../models/subscription';
import { IUserDocument } from '../../models/user';
import { VisitorModel } from '../../models/visitor';
import { ActiveCampaignListId, SubscriptionCode, SubscriptionStatus } from '../../types/subscription';

export const updateNewUserSubscriptions = async (user: IUserDocument) => {
  const subscribe = [ActiveCampaignListId.AccountUpdates, ActiveCampaignListId.GeneralUpdates];
  const { email } = user.emails.find(e => e.primary);
  const visitor = await VisitorModel.findOneAndUpdate({ email }, { user: user._id }, { new: true });
  if (visitor) {
    await updateActiveCampaignListStatus(email, subscribe, [ActiveCampaignListId.MonthyNewsletters]);

    // cancel monthly newsletter subscription
    await SubscriptionModel.findOneAndUpdate({ visitor: visitor._id, code: SubscriptionCode.monthlyNewsletters }, { status: SubscriptionStatus.Cancelled });
    // associate subscriptions with new user
    await SubscriptionModel.updateMany({ visitor: visitor._id }, { $set: { user: user._id, lastModified: getUtcDate() } });
  } else {
    await updateActiveCampaignListStatus(email, subscribe, []);
  }
  await SubscriptionModel.create({ code: SubscriptionCode.accountUpdates, user: user._id, visitor: visitor?._id, status: SubscriptionStatus.Active });
  await SubscriptionModel.create({ code: SubscriptionCode.generalUpdates, user: user._id, visitor: visitor?._id, status: SubscriptionStatus.Active });
};

export const updateSubscriptionsIfUserWasVisitor = async (email: string, user: string) => {
  const visitor = await VisitorModel.findOneAndUpdate({ email }, { user }, { new: true });
  if (visitor) {
    await updateActiveCampaignListStatus(email, [], [ActiveCampaignListId.MonthyNewsletters]);
    await SubscriptionModel.findOneAndUpdate({ visitor: visitor._id, code: SubscriptionCode.monthlyNewsletters }, { status: SubscriptionStatus.Cancelled });
    // assicaite visitor's subscriptions with the user
    await SubscriptionModel.updateMany({ visitor: visitor._id }, { $set: { user, lastModified: getUtcDate() } });
  }
};

export const updateUserSubscriptions = async (user: string, subscribe: Array<SubscriptionCode>, unsubscribe: Array<SubscriptionCode>) => {
  if (subscribe?.length > 0) {
    await Promise.all(
      subscribe.map(async (code) => {
        await SubscriptionModel.findOneAndUpdate({ user, code }, { user, code, lastModified: getUtcDate(), status: SubscriptionStatus.Active }, { upsert: true });
      }),
    );
  }

  if (unsubscribe?.length > 0) {
    await SubscriptionModel.updateMany({ user, code: { $in: unsubscribe } }, { lastModified: getUtcDate(), status: SubscriptionStatus.Cancelled });
  }
};
