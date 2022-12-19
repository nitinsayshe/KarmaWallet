import isemail from 'isemail';
import { FilterQuery, ObjectId, UpdateQuery } from 'mongoose';
import { getSubscribedLists, updateActiveCampaignListStatus } from '../../integrations/activecampaign';
import { ErrorTypes, UserGroupRole } from '../../lib/constants';
import { ProviderProductIdToSubscriptionCode, SubscriptionCodeToProviderProductId } from '../../lib/constants/subscription';
import CustomError from '../../lib/customError';
import { getUtcDate } from '../../lib/date';
import { IGroupDocument } from '../../models/group';
import { ISubscription, SubscriptionModel } from '../../models/subscription';
import { IEmail, IUser, IUserDocument, UserModel } from '../../models/user';
import { IUserGroup, UserGroupModel } from '../../models/userGroup';
import { IVisitorDocument, VisitorModel } from '../../models/visitor';
import { UserGroupStatus } from '../../types/groups';
import { IRequest } from '../../types/request';
import { ActiveCampaignListId, SubscriptionCode, SubscriptionStatus } from '../../types/subscription';

export interface UserSubscriptions {
  userId: string;
  subscribe: Array<SubscriptionCode>;
  unsubscribe: Array<SubscriptionCode>;
}

export interface INewsletterUnsubscribeData {
  email: string;
  preserveSubscriptions: SubscriptionCode[];
}

const shareableUnsubscribeError = 'Error processing unsubscribe request.';

export const updateNewUserSubscriptions = async (user: IUserDocument) => {
  const { email } = user.emails.find((e) => e.primary);
  const visitor = await VisitorModel.findOneAndUpdate(
    { email },
    { user: user._id },
    { new: true },
  );
  if (!!visitor) {
    // check if they are receiving the general updates newsletter and add it if not
    const subscribe = [ActiveCampaignListId.AccountUpdates];
    const sub = await SubscriptionModel.findOne({
      visitor: visitor._id,
      code: SubscriptionCode.generalUpdates,
    });
    if (!(sub?.status === SubscriptionStatus.Active)) {
      subscribe.push(ActiveCampaignListId.GeneralUpdates);
    }
    await updateActiveCampaignListStatus(email, subscribe, [
      ActiveCampaignListId.MonthyNewsletters,
    ]);
    // cancel monthly newsletter subscription if subscribed
    await SubscriptionModel.findOneAndUpdate(
      { visitor: visitor._id, code: SubscriptionCode.monthlyNewsletters },
      { status: SubscriptionStatus.Cancelled },
    );
    // associate subscriptions with new user
    await SubscriptionModel.updateMany(
      { visitor: visitor._id },
      { $set: { user: user._id, lastModified: getUtcDate() } },
    );
  } else {
    await updateActiveCampaignListStatus(
      email,
      [
        ActiveCampaignListId.AccountUpdates,
        ActiveCampaignListId.GeneralUpdates,
      ],
      [],
    );
  }
  await SubscriptionModel.create({
    code: SubscriptionCode.accountUpdates,
    user: user._id,
    visitor: visitor?._id,
    status: SubscriptionStatus.Active,
  });
  // findOne with upsert instead of create because they may have already subscribed to the newsletter
  await SubscriptionModel.findOne(
    {
      code: SubscriptionCode.generalUpdates,
      user: user._id,
      visitor: visitor?._id,
      status: SubscriptionStatus.Active,
    },
    {},
    { upsert: true },
  );
};

export const updateSubscriptionsIfUserWasVisitor = async (
  email: string,
  user: string,
) => {
  const visitor = await VisitorModel.findOneAndUpdate(
    { email },
    { user },
    { new: true },
  );
  if (!!visitor) {
    await updateActiveCampaignListStatus(
      email,
      [],
      [ActiveCampaignListId.MonthyNewsletters],
    );
    await SubscriptionModel.findOneAndUpdate(
      { visitor: visitor._id, code: SubscriptionCode.monthlyNewsletters },
      { status: SubscriptionStatus.Cancelled },
    );
    // assicaite visitor's subscriptions with the user
    await SubscriptionModel.updateMany(
      { visitor: visitor._id },
      { $set: { user, lastModified: getUtcDate() } },
    );
  }
};

export const updateUserSubscriptions = async (
  user: string,
  subscribe: Array<SubscriptionCode>,
  unsubscribe: Array<SubscriptionCode>,
) => {
  if (subscribe?.length > 0) {
    await Promise.all(
      subscribe.map(async (code) => {
        await SubscriptionModel.findOneAndUpdate(
          { user, code },
          {
            user,
            code,
            lastModified: getUtcDate(),
            status: SubscriptionStatus.Active,
          },
          { upsert: true },
        );
      }),
    );
  }

  if (unsubscribe?.length > 0) {
    await SubscriptionModel.updateMany(
      { user, code: { $in: unsubscribe } },
      { lastModified: getUtcDate(), status: SubscriptionStatus.Cancelled },
    );
  }
};

export const cancelUserSubscriptions = async (userId: string) => {
  const subs = await SubscriptionModel.find({ user: userId }).lean();
  const unsubscribe = subs?.map((sub) => sub.code);

  if (unsubscribe?.length > 0) {
    await updateUserSubscriptions(userId, [], unsubscribe);
  }
};

export const updateUsersSubscriptions = async (
  userSubs: UserSubscriptions[],
) => {
  if (!userSubs || userSubs.length <= 0) return;
  Promise.all(
    userSubs.map(async (userSub) => {
      await updateUserSubscriptions(
        userSub.userId,
        userSub.subscribe,
        userSub.unsubscribe,
      );
    }),
  );
};

const reconcileActiveCampaignListSubscriptions = async (userId: ObjectId, subs: ActiveCampaignListId[]) => {
  // get a list of all active campaign subscription codes
  const activeCampaignSubs = Object.values(ActiveCampaignListId).map((id) => ProviderProductIdToSubscriptionCode[id]);
  /* update any activeCampaignSubs in subs to Active -- with upsert */
  if (subs && subs.length > 0) {
    await SubscriptionModel.updateMany(
      {
        user: userId,
        code: { $in: subs.map((sub) => ProviderProductIdToSubscriptionCode[sub]) },
      },
      {
        lastModified: getUtcDate(),
        status: SubscriptionStatus.Active,
      },
      { upsert: true },
    );
  }

  /* update any activeCampaignSubs not in subs to cancelled -- no upsert */
  await SubscriptionModel.updateMany(
    {
      $and: [
        { user: userId },
        { code: { $in: activeCampaignSubs } },
        { code: { $nin: subs } },
      ],
    },
    {
      lastModified: getUtcDate(),
      status: SubscriptionStatus.Cancelled,
    },
  );
};

const getActiveCampaignSubscriptions = async (email: string): Promise<ActiveCampaignListId[]> => {
  try {
    return await getSubscribedLists(email);
  } catch (err) {
    throw new CustomError(shareableUnsubscribeError, ErrorTypes.SERVER);
  }
};

export const getUserGroupSubscriptionsToUpdate = async (user: Partial<IUser & { _id: ObjectId }>, groupToBeDeleted?: ObjectId): Promise<UserSubscriptions> => {
  try {
    const userSub: UserSubscriptions = {
      userId: user._id.toString(),
      subscribe: [],
      unsubscribe: [],
    };

    const email = user?.emails?.find((e: IEmail) => e.primary)?.email;
    if (!email) {
      console.log(JSON.stringify(user));
      return userSub;
    }

    // get active campaign subscrtiptions for this email
    const activeCampaignListIds = await getActiveCampaignSubscriptions(email);
    // update db with active campaign subscriptions
    await reconcileActiveCampaignListSubscriptions(user._id, activeCampaignListIds);

    /* Should the user be enrolled in the admin list? */
    const adminQuery: FilterQuery<IUserGroup> = {
      $and: [
        { user: user._id },
        { role: { $in: [UserGroupRole.Admin, UserGroupRole.SuperAdmin, UserGroupRole.Owner] } },
        { status: { $nin: [UserGroupStatus.Left, UserGroupStatus.Banned, UserGroupStatus.Removed] } },
      ],
    };

    if (!!groupToBeDeleted) {
      adminQuery.$and.push({ group: { $ne: groupToBeDeleted } });
    }
    const adminUserGroups = await UserGroupModel.find(adminQuery).lean();

    if (!!adminUserGroups && adminUserGroups?.length > 0) {
      if (!activeCampaignListIds || !activeCampaignListIds.includes(ActiveCampaignListId.GroupAdmins)) {
        userSub.subscribe.push(SubscriptionCode.groupAdmins);
      }
    } else if (!!activeCampaignListIds && activeCampaignListIds.includes(ActiveCampaignListId.GroupAdmins)) {
      userSub.unsubscribe.push(SubscriptionCode.groupAdmins);
    }

    // check if they are a member of any groups
    const memberQuery: FilterQuery<IUserGroup> = {
      $and: [
        { user: user._id },
        { status: { $nin: [UserGroupStatus.Left, UserGroupStatus.Banned, UserGroupStatus.Removed] } },
      ],
    };
    if (!!groupToBeDeleted) {
      memberQuery.$and.push({ group: { $ne: groupToBeDeleted } });
    }

    const memberships = await UserGroupModel.find(memberQuery).lean();
    if (!!memberships && memberships?.length > 0) {
      if (!activeCampaignListIds && !activeCampaignListIds.includes(ActiveCampaignListId.GroupMembers)) {
        userSub.subscribe.push(SubscriptionCode.groupMembers);
      }
    } else if (!!activeCampaignListIds && activeCampaignListIds.includes(ActiveCampaignListId.GroupMembers)) {
      userSub.unsubscribe.push(SubscriptionCode.groupMembers);
    }

    return userSub;
  } catch (err) {
    console.error('Error generating subscription list', err);
  }
};

export const getUpdatedGroupChangeSubscriptions = async (group: IGroupDocument, groupToBeDeleted: boolean): Promise<UserSubscriptions[]> => {
  try {
    const groupUsers = await UserGroupModel.find({
      $and: [
        { group: group._id },
        {
          status: {
            $nin: [
              UserGroupStatus.Left,
              UserGroupStatus.Banned,
              UserGroupStatus.Removed,
            ],
          },
        },
      ],
    }).lean();
    if (!groupUsers || groupUsers.length <= 0) {
      return [];
    }

    let userSubscriptions = await Promise.all(
      groupUsers.map(async (userGroup) => getUserGroupSubscriptionsToUpdate(userGroup.user as Partial<IUserDocument>, groupToBeDeleted ? group._id : undefined)),
    );

    userSubscriptions = userSubscriptions.filter((sub) => sub.subscribe.length > 0 || sub.unsubscribe.length > 0);
    return userSubscriptions || [];
  } catch (err) {
    console.error('Error generating subscription list', err);
  }
};

// Check that the subscription code is valid and maps to a valid provider product id
export const subscriptionCodesAreValid = (
  codes: SubscriptionCode[],
): boolean => {
  if (!codes || codes.length === 0) return false;
  let codesAreValid = true;
  codes?.forEach((code) => {
    const c = SubscriptionCode[code];
    if (!SubscriptionCode[code]) {
      codesAreValid = false;
      return;
    }
    const productId = SubscriptionCodeToProviderProductId[c] as ActiveCampaignListId;
    if (!productId) {
      codesAreValid = false;
    }
  });

  return codesAreValid;
};

const getUserByEmail = async (email: string): Promise<IUserDocument> => {
  try {
    return await UserModel.findOne({ 'emails.email': email });
  } catch (err) {
    console.error(`Error searching for user with email ${email}:`, err);
    throw new CustomError(shareableUnsubscribeError, ErrorTypes.SERVER);
  }
};

const getVisitorByEmail = async (email: string): Promise<IVisitorDocument> => {
  try {
    return await VisitorModel.findOne({ email });
  } catch (err) {
    console.error(`Error searching for visitor with email ${email}:`, err);
    throw new CustomError(shareableUnsubscribeError, ErrorTypes.SERVER);
  }
};

const updateSubscriptionsByQuery = async (
  query: FilterQuery<ISubscription>,
  update: UpdateQuery<ISubscription>,
) => {
  try {
    return await SubscriptionModel.updateMany(query, update);
  } catch (err) {
    console.error('Error searching for subscription:', err);
    throw new CustomError(shareableUnsubscribeError, ErrorTypes.SERVER);
  }
};

const unsubscribeFromActiveCampaignNewsletters = async (email: string, unsubscribe: ActiveCampaignListId[]) => {
  try {
    await updateActiveCampaignListStatus(email, [], unsubscribe);
  } catch (err) {
    console.error(`Error unsubscribing contact with email ${email} from newsletters:`, err);
    throw new CustomError(shareableUnsubscribeError, ErrorTypes.SERVER);
  }
};

export const newsletterUnsubscribe = async (
  _: IRequest,
  email: string,
  preserveSubscriptions: SubscriptionCode[],
) => {
  try {
    if (!email || !isemail.validate(email, { minDomainAtoms: 2 })) {
      throw new CustomError('Invalid email format.', ErrorTypes.INVALID_ARG);
    }
    email = email.toLowerCase();

    if (!!preserveSubscriptions && preserveSubscriptions?.length > 0) {
      if (!subscriptionCodesAreValid(preserveSubscriptions)) {
        throw new CustomError(shareableUnsubscribeError, ErrorTypes.GEN);
      }
    }

    // get active campaign subscrtiptions for this email
    const activeCampaignListIds = await getActiveCampaignSubscriptions(email);
    if (!activeCampaignListIds || activeCampaignListIds.length <= 0) {
      // user has no active subscriptions
      throw new CustomError(shareableUnsubscribeError, ErrorTypes.UNPROCESSABLE);
    }

    // filter out any in the perserve list
    const unsubscribeLists = activeCampaignListIds.filter(
      (providerProductId) => !preserveSubscriptions.includes(
        ProviderProductIdToSubscriptionCode[providerProductId],
      ),
    );

    // update db subscriptions
    const unsubscribe: SubscriptionCode[] = unsubscribeLists.map((providerProductId) => ProviderProductIdToSubscriptionCode[providerProductId]);
    if (!unsubscribe || unsubscribe?.length <= 0) {
      throw new CustomError(shareableUnsubscribeError, ErrorTypes.UNPROCESSABLE);
    }

    const update: UpdateQuery<ISubscription> = {
      $set: {
        status: SubscriptionStatus.Cancelled,
        lastModified: getUtcDate(),
      },
    };
    const filter: FilterQuery<ISubscription> = {
      code: { $in: unsubscribe },
    };

    // cancel db subscriptions
    const user = await getUserByEmail(email);
    const visitor = await getVisitorByEmail(email);
    if (!!user) {
      filter.user = user._id;
    } else if (!!visitor) {
      filter.visitor = visitor._id;
    } else {
      throw new CustomError(shareableUnsubscribeError, ErrorTypes.UNPROCESSABLE);
    }
    await updateSubscriptionsByQuery(filter, update);

    // cancel in active campaign
    await unsubscribeFromActiveCampaignNewsletters(email, unsubscribeLists);
  } catch (err) {
    console.log('Error unsubcribing', err);
    throw err;
  }
};
