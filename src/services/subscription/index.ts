import { updateActiveCampaignListStatus } from '../../integrations/activecampaign';
import { UserGroupRole } from '../../lib/constants';
import { getUtcDate } from '../../lib/date';
import { IGroupDocument } from '../../models/group';
import { SubscriptionModel } from '../../models/subscription';
import { IUserDocument } from '../../models/user';
import { IUserGroupDocument, UserGroupModel } from '../../models/userGroup';
import { VisitorModel } from '../../models/visitor';
import { UserGroupStatus } from '../../types/groups';
import { ActiveCampaignListId, SubscriptionCode, SubscriptionStatus } from '../../types/subscription';

export interface UserSubscriptions {
  userId: string,
  subscribe: Array<SubscriptionCode>,
  unsubscribe: Array<SubscriptionCode>
}

export const updateNewUserSubscriptions = async (user: IUserDocument) => {
  const { email } = user.emails.find(e => e.primary);
  const visitor = await VisitorModel.findOneAndUpdate({ email }, { user: user._id }, { new: true });
  if (visitor) {
    // check if they are receiving the general updates newsletter and add it if not
    const subscribe = [ActiveCampaignListId.AccountUpdates];
    const sub = await SubscriptionModel.findOne({ visitor: visitor._id, code: SubscriptionCode.generalUpdates });
    if (!(sub?.status === SubscriptionStatus.Active)) {
      subscribe.push(ActiveCampaignListId.GeneralUpdates);
    }
    await updateActiveCampaignListStatus(email, subscribe, [ActiveCampaignListId.MonthyNewsletters]);
    // cancel monthly newsletter subscription if subscribed
    await SubscriptionModel.findOneAndUpdate({ visitor: visitor._id, code: SubscriptionCode.monthlyNewsletters }, { status: SubscriptionStatus.Cancelled });
    // associate subscriptions with new user
    await SubscriptionModel.updateMany({ visitor: visitor._id }, { $set: { user: user._id, lastModified: getUtcDate() } });
  } else {
    await updateActiveCampaignListStatus(email, [ActiveCampaignListId.AccountUpdates, ActiveCampaignListId.GeneralUpdates], []);
  }
  await SubscriptionModel.create({ code: SubscriptionCode.accountUpdates, user: user._id, visitor: visitor?._id, status: SubscriptionStatus.Active });
  // findOne with upsert instead of create because they may have already subscribed to the newsletter
  await SubscriptionModel.findOne({ code: SubscriptionCode.generalUpdates, user: user._id, visitor: visitor?._id, status: SubscriptionStatus.Active }, {}, { upsert: true });
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

export const cancelUserSubscriptions = async (userId: string) => {
  const subs = await SubscriptionModel.find({ user: userId }).lean();
  const unsubscribe = subs?.map((sub) => sub.code);

  if (unsubscribe?.length > 0) {
    await updateUserSubscriptions(userId, [], unsubscribe);
  }
};

export const updateUsersSubscriptions = async (userSubs: UserSubscriptions[]) => {
  Promise.all(userSubs.map(async (userSub) => {
    await updateUserSubscriptions(userSub.userId, userSub.subscribe, userSub.unsubscribe);
  }));
};

export const getUpdatedGroupChangeSubscriptions = async (group: IGroupDocument): Promise<UserSubscriptions[]> => {
  const subs: UserSubscriptions[] = [];

  try {
  // look up all admins in this group
    const newAdminUserGroups = await UserGroupModel.find(
      { $and: [
        { group: group._id },
        { role: { $in: [UserGroupRole.Admin, UserGroupRole.SuperAdmin, UserGroupRole.Owner] } },
        { status: { $nin: [UserGroupStatus.Left, UserGroupStatus.Banned, UserGroupStatus.Removed] } },
      ] },
    ).lean();

    // add new admins to admin list
    if (newAdminUserGroups?.length > 0) {
      newAdminUserGroups.forEach((userGroup) => {
        subs.push({
          userId: userGroup.user.toString(),
          subscribe: [SubscriptionCode.groupAdmins],
          unsubscribe: [],
        });
      });
    }

    // make sure all other users are subscribed to groupMembers
    const usersToUpdate = await UserGroupModel.find({ $and: [
      { group: group._id },
      { status: { $nin: [UserGroupStatus.Left, UserGroupStatus.Banned, UserGroupStatus.Removed] } },
      { role: { $nin: [UserGroupRole.Admin, UserGroupRole.SuperAdmin, UserGroupRole.Owner] } },
    ] }).lean();
    await Promise.all(usersToUpdate.map(async (userGroup: Partial<IUserGroupDocument>) => {
      const userSub = await SubscriptionModel.findOne({ code: SubscriptionCode.groupMembers, user: userGroup.user }).lean();

      const userSubscription = subs.find(s => s.userId === userSub.user.toString());
      if (userSubscription) {
        if (!userSubscription.subscribe) userSubscription.subscribe = [];
        userSubscription.subscribe.push(SubscriptionCode.groupMembers);
      } else {
        subs.push({
          userId: userGroup.user.toString(),
          subscribe: [SubscriptionCode.groupMembers],
          unsubscribe: [],
        });
      }
    }));
    return subs;
  } catch (err) {
    console.error('Error generating subscription list', err);
  }
};
