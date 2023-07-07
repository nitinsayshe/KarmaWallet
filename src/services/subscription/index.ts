import { FieldValue } from 'aws-sdk/clients/cloudsearch';
import isemail from 'isemail';
import { FilterQuery, ObjectId, Types, UpdateQuery } from 'mongoose';
import { IGetContactResponse } from '../../clients/activeCampaign';
import {
  contactListToSubscribedListIDs,
  FieldValues,
  getActiveCampaignContactByEmail,
  getActiveCampaignTags,
  getSubscribedLists,
  updateActiveCampaignData,
  updateActiveCampaignListStatus,
} from '../../integrations/activecampaign';
import { ErrorTypes, UserGroupRole } from '../../lib/constants';
import {
  ProviderProductIdToSubscriptionCode,
  SubscriptionCodeToProviderProductId,
} from '../../lib/constants/subscription';
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
  const visitor = await VisitorModel.findOneAndUpdate({ email }, { user: user._id }, { new: true });
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
    await updateActiveCampaignListStatus(email, subscribe, [ActiveCampaignListId.MonthyNewsletters]);
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
      [ActiveCampaignListId.AccountUpdates, ActiveCampaignListId.GeneralUpdates],
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

export const getActiveCampaignSubscribedSubscriptionCodes = async (email: string): Promise<SubscriptionCode[]> => {
  const listIds = await getActiveCampaignSubscribedListIds(email);
  return listIds.map((id) => ProviderProductIdToSubscriptionCode[id]);
};

export const getActiveCampaignSubscribedListIds = async (email: string): Promise<ActiveCampaignListId[]> => {
  try {
    return await getSubscribedLists(email);
  } catch (err) {
    throw new CustomError(shareableUnsubscribeError, ErrorTypes.SERVER);
  }
};

// orchestrates reaching out to active campaign and transferring subscriptions
export const updateSubscriptionsOnEmailChange = async (
  userId: Types.ObjectId,
  name: string,
  prevEmail: string,
  newEmail: string,
): Promise<void> => {
  let prevSubs: SubscriptionCode[] = [];
  let prevCustomFields: FieldValues | {} = {};

  const transferTags = await getActiveCampaignTags(userId._id.toString());

  try {
    let prevContact: IGetContactResponse | null = null;
    // get custom field values from the prev email
    prevContact = await getActiveCampaignContactByEmail(prevEmail);
    prevSubs = contactListToSubscribedListIDs(prevContact.contactLists).map(
      (id) => ProviderProductIdToSubscriptionCode[id],
    );
    prevCustomFields = prevContact.fieldValues
      ?.map((field) => {
        const id = parseInt(field.field, 10);
        if (isNaN(id)) return {};

        return {
          id,
          value: field.value,
        };
      })
      ?.filter((field) => (field as FieldValue) || {});
  } catch (err) {
    console.log('no previous subs found for ', prevEmail);
  }

  let newEmailSubs: SubscriptionCode[] = [];
  try {
    newEmailSubs = await getActiveCampaignSubscribedSubscriptionCodes(newEmail);
  } catch (err) {
    console.log('no previous subs found for ', newEmail);
  }

  // cancel new email's previous subscriptions if any
  if (prevSubs.length > 0) {
    // unsubscribe prev email from any subs in active campaign
    await updateActiveCampaignData({
      userId: userId._id,
      email: prevEmail,
      subscriptions: { unsubscribe: prevSubs, subscribe: [] },
      tags: { add: [], remove: transferTags },
    });
  }

  // remove any dupe subs that we actually want to keep
  const unsubscribeLists: SubscriptionCode[] = newEmailSubs.length > 0 ? newEmailSubs.filter((sub) => !(prevSubs?.includes(sub))) : [];

  // subscribe new email to any active list subsctiptions in active campaign
  await updateActiveCampaignData({
    firstName: name?.split(' ')[0],
    lastName: name?.split(' ')?.pop(),
    userId: userId._id,
    email: newEmail,
    subscriptions: { unsubscribe: unsubscribeLists, subscribe: prevSubs },
    tags: { add: transferTags, remove: [] },
    customFields: prevCustomFields as FieldValues,
  });

  // TODO: rollback if error occurred?
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

export const updateUsersSubscriptions = async (userSubs: UserSubscriptions[]) => {
  if (!userSubs || userSubs.length <= 0) return;
  Promise.all(
    userSubs.map(async (userSub) => {
      await updateUserSubscriptions(userSub.userId, userSub.subscribe, userSub.unsubscribe);
    }),
  );
};

/*
 * Takes active campaign sub ids and converts them into subscription codes and
 * makes sure the user/visitor is subscribed to them
 * user or visitor will be unsubscribed from any subscription not included in
 * subCodes or the converted activeCampaignSubs
 */
const reconcileActiveCampaignListSubscriptions = async (
  id: Types.ObjectId,
  activeCampaignSubs: ActiveCampaignListId[],
  subCodes: SubscriptionCode[] = [],
  visitor: boolean = false,
) => {
  // get a list of all active campaign subscription codes
  const activeCampaignSubCodes = Object.values(ActiveCampaignListId).map(
    (id) => ProviderProductIdToSubscriptionCode[id],
  );
  const codes = activeCampaignSubs?.map((sub) => ProviderProductIdToSubscriptionCode[sub])?.concat(subCodes) || subCodes;

  /* update any activeCampaignSubs in subs to Active -- with upsert */
  const subscribeFilter: FilterQuery<ISubscription> = visitor
    ? {
      user: id,
      code: { $in: codes },
    }
    : {
      visitor: id,
      code: { $in: codes },
    };
  if (activeCampaignSubs && activeCampaignSubs.length > 0) {
    await SubscriptionModel.updateMany(
      subscribeFilter,
      {
        lastModified: getUtcDate(),
        status: SubscriptionStatus.Active,
      },
      { upsert: true },
    );
  }

  /* update any activeCampaignSubs not in subs to cancelled -- no upsert */
  const cancelFilter: FilterQuery<ISubscription> = visitor
    ? {
      $and: [{ visitor: id }, { code: { $in: activeCampaignSubCodes } }, { code: { $nin: codes } }],
    }
    : {
      $and: [{ user: id }, { code: { $in: activeCampaignSubCodes } }, { code: { $nin: codes } }],
    };

  await SubscriptionModel.updateMany(cancelFilter, {
    lastModified: getUtcDate(),
    status: SubscriptionStatus.Cancelled,
  });
};

const getNonActiveCampaignSubscriptions = async (userId: Types.ObjectId): Promise<SubscriptionCode[]> => {
  const nonActiveCampaignSubs = await SubscriptionModel.find({
    user: userId,
    code: { $nin: Object.values(ActiveCampaignListId).map((id) => ProviderProductIdToSubscriptionCode[id]) },
  }).lean();

  return nonActiveCampaignSubs.map((sub) => sub.code);
};

export const getUserGroupSubscriptionsToUpdate = async (
  user: Partial<IUser & { _id: ObjectId }>,
  groupToBeDeleted?: ObjectId,
): Promise<UserSubscriptions> => {
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
    const activeCampaignListIds = await getActiveCampaignSubscribedListIds(email);

    // add ids of any active subs not from active campaign
    const nonActiveCampaignSubs = await getNonActiveCampaignSubscriptions(user._id as unknown as Types.ObjectId);

    // update db with active campaign subscriptions
    await reconcileActiveCampaignListSubscriptions(
      new Types.ObjectId(user._id.toString()),
      activeCampaignListIds,
      nonActiveCampaignSubs,
    );

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
      if (!activeCampaignListIds || !activeCampaignListIds.includes(ActiveCampaignListId.GroupMembers)) {
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

export const getUpdatedGroupChangeSubscriptions = async (
  group: IGroupDocument,
  groupToBeDeleted: boolean,
): Promise<UserSubscriptions[]> => {
  try {
    const groupUsers = await UserGroupModel.find({
      $and: [
        { group: group._id },
        {
          status: {
            $nin: [UserGroupStatus.Left, UserGroupStatus.Banned, UserGroupStatus.Removed],
          },
        },
      ],
    }).lean();
    if (!groupUsers || groupUsers.length <= 0) {
      return [];
    }

    let userSubscriptions = await Promise.all(
      groupUsers.map(async (userGroup) => getUserGroupSubscriptionsToUpdate(
        userGroup.user as Partial<IUserDocument>,
        groupToBeDeleted ? group._id : undefined,
      )),
    );

    userSubscriptions = userSubscriptions.filter((sub) => sub.subscribe.length > 0 || sub.unsubscribe.length > 0);
    return userSubscriptions || [];
  } catch (err) {
    console.error('Error generating subscription list', err);
  }
};

// Check that the subscription code is valid and maps to a valid provider product id
export const subscriptionCodesAreValid = (codes: SubscriptionCode[]): boolean => {
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

const updateSubscriptionsByQuery = async (query: FilterQuery<ISubscription>, update: UpdateQuery<ISubscription>) => {
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

export const newsletterUnsubscribe = async (_: IRequest, email: string, preserveSubscriptions: SubscriptionCode[]) => {
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
    const activeCampaignListIds = await getActiveCampaignSubscribedListIds(email);
    if (!activeCampaignListIds || activeCampaignListIds.length <= 0) {
      // user has no active subscriptions
      throw new CustomError(shareableUnsubscribeError, ErrorTypes.UNPROCESSABLE);
    }

    // filter out any in the perserve list
    const unsubscribeLists = activeCampaignListIds.filter(
      (providerProductId) => !preserveSubscriptions.includes(ProviderProductIdToSubscriptionCode[providerProductId]),
    );

    // update db subscriptions
    const unsubscribe: SubscriptionCode[] = unsubscribeLists.map(
      (providerProductId) => ProviderProductIdToSubscriptionCode[providerProductId],
    );
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
