import { updateActiveCampaignListStatus } from '../../integrations/activecampaign';
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
    // update visitor subscrition
    await SubscriptionModel.findOneAndUpdate({ visitor: visitor._id, code: SubscriptionCode.monthlyNewsletters }, { user: user._id, status: SubscriptionStatus.Cancelled });
  } else {
    await updateActiveCampaignListStatus(email, subscribe, []);
  }
  await SubscriptionModel.create({ code: SubscriptionCode.accountUpdates, user: user._id, visitor: visitor?._id, status: SubscriptionStatus.Active });
  await SubscriptionModel.create({ code: SubscriptionCode.generalUpdates, user: user._id, visitor: visitor?._id, status: SubscriptionStatus.Active });
};

export const updateSubscriptionIfUserWasAVisitor = async (email: string, user: string) => {
  const visitor = await VisitorModel.findOneAndUpdate({ email }, { user }, { new: true });
  if (visitor) {
    await updateActiveCampaignListStatus(email, [], [ActiveCampaignListId.MonthyNewsletters]);
    await SubscriptionModel.findOneAndUpdate({ visitor: visitor._id, code: SubscriptionCode.monthlyNewsletters }, { user, status: SubscriptionStatus.Cancelled });
  }
};
