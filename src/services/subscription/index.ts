import { FieldValue } from 'aws-sdk/clients/cloudsearch';
import { AxiosInstance } from 'axios';
import dayjs from 'dayjs';
import isemail from 'isemail';
import { FilterQuery, ObjectId, Types, UpdateQuery } from 'mongoose';
import { IGetContactResponse } from '../../clients/activeCampaign';
import {
  contactListToSubscribedListIDs,
  FieldValues,
  getActiveCampaignContactByEmail,
  getActiveCampaignTags,
  getSubscribedLists,
  subscribeContactToList,
  updateActiveCampaignData,
  updateActiveCampaignListStatusForEmail,
  updateCustomFields,
} from '../../integrations/activecampaign';
import { ErrorTypes, UserGroupRole, MiscAppVersionKey, AppVersionEnum, GroupTagsEnum } from '../../lib/constants';
import { ActiveCampaignCustomFields } from '../../lib/constants/activecampaign';
import { ProviderProductIdToSubscriptionCode, SubscriptionCodeToProviderProductId } from '../../lib/constants/subscription';
import CustomError from '../../lib/customError';
import { getUtcDate } from '../../lib/date';
import { sleep } from '../../lib/misc';
import { GroupModel, IGroupDocument } from '../../models/group';
import { MiscModel } from '../../models/misc';
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

export const subscribeToDebitCardholderList = async (user: IUserDocument) => {
  const { email } = user.emails.find((e) => e.primary);
  const subscribe = [ActiveCampaignListId.DebitCardHolders];
  await updateActiveCampaignListStatusForEmail(email, subscribe, []);
  await SubscriptionModel.create({
    code: SubscriptionCode.debitCardHolders,
    user: user._id,
    status: SubscriptionStatus.Active,
  });
};

export const subscribeToEmployerProgramBetaList = async (user: IUserDocument) => {
  const { email } = user.emails.find((e) => e.primary);
  const subscribe = [ActiveCampaignListId.EmployerProgramBeta];
  await updateActiveCampaignListStatusForEmail(email, subscribe, []);
  await SubscriptionModel.create({
    code: SubscriptionCode.employerProgramBeta,
    user: user._id,
    status: SubscriptionStatus.Active,
  });
};

export const subscribeToBetaTestersList = async (user: IUserDocument) => {
  const { email } = user.emails.find((e) => e.primary);
  const subscribe = [ActiveCampaignListId.BetaTesters];
  await updateActiveCampaignListStatusForEmail(email, subscribe, []);
  await SubscriptionModel.create({
    code: SubscriptionCode.betaTesters,
    user: user._id,
    status: SubscriptionStatus.Active,
  });
};

export const subscribeToGroupList = async (user: IUserDocument, groupId: string) => {
  const { email } = user.emails.find((e) => e.primary);
  const group = await GroupModel.findById(groupId).lean();
  const groupName = group?.name;
  const subscribe = [ActiveCampaignListId.GroupMembers];
  await updateActiveCampaignListStatusForEmail(email, subscribe, []);
  console.log('///// should subscribe to list', groupName);
  await SubscriptionModel.create({
    code: SubscriptionCode.groupMembers,
    user: user._id,
    status: SubscriptionStatus.Active,
  });

  await updateActiveCampaignData({
    userId: user._id,
    email,
    subscriptions: { unsubscribe: [], subscribe: [] },
    tags: { add: [groupName], remove: [] },
  });
};

export interface IActiveCampaignSubscribeData {
  tags?: string[];
  debitCardholder?: boolean;
  groupName?: string;
  employerBeta?: boolean;
  beta?: boolean;
}

export const updateNewUserSubscriptions = async (user: IUserDocument, additionalData?: IActiveCampaignSubscribeData) => {
  const { email } = user.emails.find((e) => e.primary);
  const visitor = await VisitorModel.findOneAndUpdate({ email }, { user: user._id }, { new: true });
  const { tags, debitCardholder, groupName, employerBeta, beta } = additionalData || {};
  console.log('//// /should update', additionalData);
  // eslint-disable-next-line no-debugger
  debugger;
  if (!!visitor) {
    const subscribe = [];
    const unsubscribe = [ActiveCampaignListId.MonthyNewsletters];

    // check if they are receiving the general updates newsletter and add it if not
    const sub = await SubscriptionModel.findOne({
      visitor: visitor._id,
      code: SubscriptionCode.generalUpdates,
    });
    // add them to general update if they are not receiving yet
    if (!(sub?.status === SubscriptionStatus.Active)) {
      subscribe.push(ActiveCampaignListId.GeneralUpdates);
    }

    // Joined Web App flow
    if (!debitCardholder) {
      // add to web account updates
      subscribe.push(ActiveCampaignListId.AccountUpdates);
      const subscribedResponse = await updateActiveCampaignListStatusForEmail(email, subscribe, unsubscribe, tags || []);
      console.log('///// SUBSCRIBE RESPONSE', subscribedResponse);
    } else {
      // eslint-disable-next-line no-debugger
      debugger;
      // Debit Card Holder flow
      subscribe.push(ActiveCampaignListId.DebitCardHolders);
      if (!!groupName) subscribe.push(ActiveCampaignListId.GroupMembers);
      if (!!employerBeta) subscribe.push(ActiveCampaignListId.EmployerProgramBeta);
      if (!!beta) subscribe.push(ActiveCampaignListId.BetaTesters);
      console.log('//// needs to subscribe');
      // eslint-disable-next-line no-debugger
      debugger;
      const subscribedResponse = await updateActiveCampaignListStatusForEmail(email, subscribe, unsubscribe, tags || []);
      // eslint-disable-next-line no-debugger
      debugger;
      console.log('///// SUBSCRIBE RESPONSE', subscribedResponse);
    }

    await SubscriptionModel.findOneAndUpdate(
      { visitor: visitor._id, code: SubscriptionCode.monthlyNewsletters },
      { status: SubscriptionStatus.Cancelled },
    );

    // associate subscriptions with new user
    await SubscriptionModel.updateMany({ visitor: visitor._id }, { $set: { user: user._id, lastModified: getUtcDate() } });
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
  } else {
    // if no visitor then we do not need to update any subscriptions, we just need to subscribe the user
    if (!debitCardholder) {
      await updateActiveCampaignListStatusForEmail(email, [ActiveCampaignListId.AccountUpdates, ActiveCampaignListId.GeneralUpdates], [], []);
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
    }
  }
};

export const getActiveCampaignSubscribedListIds = async (email: string, client?: AxiosInstance): Promise<ActiveCampaignListId[]> => {
  try {
    return await getSubscribedLists(email, client);
  } catch (err) {
    throw new CustomError(shareableUnsubscribeError, ErrorTypes.SERVER);
  }
};

export const getActiveCampaignSubscribedSubscriptionCodes = async (email: string): Promise<SubscriptionCode[]> => {
  const listIds = await getActiveCampaignSubscribedListIds(email);
  return listIds.map((id) => ProviderProductIdToSubscriptionCode[id]);
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
    prevSubs = contactListToSubscribedListIDs(prevContact.contactLists).map((id) => ProviderProductIdToSubscriptionCode[id]);
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
  const unsubscribeLists: SubscriptionCode[] = newEmailSubs.length > 0 ? newEmailSubs.filter((sub) => !prevSubs?.includes(sub)) : [];

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
  const activeCampaignSubCodes = Object.values(ActiveCampaignListId).map((listId) => ProviderProductIdToSubscriptionCode[listId]);
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
    await reconcileActiveCampaignListSubscriptions(new Types.ObjectId(user._id.toString()), activeCampaignListIds, nonActiveCampaignSubs);

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
      $and: [{ user: user._id }, { status: { $nin: [UserGroupStatus.Left, UserGroupStatus.Banned, UserGroupStatus.Removed] } }],
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
      groupUsers.map(async (userGroup) => getUserGroupSubscriptionsToUpdate(userGroup.user as Partial<IUserDocument>, groupToBeDeleted ? group._id : undefined)),
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
    await updateActiveCampaignListStatusForEmail(email, [], unsubscribe);
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

const activateSubscription = async (userId: Types.ObjectId, code: SubscriptionCode) => {
  try {
    await SubscriptionModel.updateMany(
      { user: userId, code },
      {
        user: userId,
        code,
        status: SubscriptionStatus.Active,
        lastModified: getUtcDate(),
      },
      { upsert: true },
    );
  } catch (err) {
    console.error('Error activating subscription', err);
    throw new CustomError(shareableUnsubscribeError, ErrorTypes.SERVER);
  }
};

export const updateNewKWCardUserSubscriptions = async (user: IUserDocument, client?: AxiosInstance) => {
  const sleepTime = 1000;
  try {
    // pull app version from misc collection
    const appVersion = await MiscModel.findOne({ key: MiscAppVersionKey });
    if (!appVersion._id) {
      throw new CustomError('Error retrieving app version', ErrorTypes.SERVER);
    }

    // Is this user from the beta invite list?
    // pull their ac lists
    const userContactLists = await getActiveCampaignSubscribedListIds(user.emails[0].email, client);
    await sleep(sleepTime);
    if (!userContactLists) {
      throw new CustomError('Error retrieving user contact lists', ErrorTypes.SERVER);
    }

    const subscriptionListsForUser: { activeCampaign: ActiveCampaignListId; subscriptionCode: SubscriptionCode }[] = [];

    // check if they're in the beta invite list
    const inBetaInviteList = userContactLists?.includes(ActiveCampaignListId.BetaTesterInvite);
    const isInBetaTestersList = userContactLists?.includes(ActiveCampaignListId.BetaTesters);

    if (!!inBetaInviteList && !isInBetaTestersList && appVersion.value === AppVersionEnum.Beta) {
      // add them to the beta testers list
      subscriptionListsForUser.push({ activeCampaign: ActiveCampaignListId.BetaTesters, subscriptionCode: SubscriptionCode.betaTesters });
    }

    // if the app is in v1, add them to the debit card holders list
    const isInDebitCardHoldersList = userContactLists?.includes(ActiveCampaignListId.DebitCardHolders);
    if (appVersion.value === AppVersionEnum.V1 && !isInDebitCardHoldersList) {
      subscriptionListsForUser.push({
        activeCampaign: ActiveCampaignListId.DebitCardHolders,
        subscriptionCode: SubscriptionCode.debitCardHolders,
      });
    }
    //
    // check if they belong to any group with the employer program beta tag
    // if so, add them to the employer program beta list if they're not already on it
    const userGroups = await UserGroupModel.find({ user: user._id }).lean();

    const isInEmployerBetaList = userContactLists?.includes(ActiveCampaignListId.EmployerProgramBeta);
    if (!isInEmployerBetaList) {
      let isInEmployerBetaGroup = false;

      try {
        await Promise.all(
          userGroups?.map(async (userGroup) => {
            if (!userGroup?.group) return;
            const group = await GroupModel.findById(userGroup.group).lean();
            if (!group?._id) return;
            if (group?.tags?.includes(GroupTagsEnum.EmployerBeta)) {
              isInEmployerBetaGroup = true;
            }
          }),
        );
      } catch (err) {
        console.error('Error retrieving group details', err);
      }
      if (isInEmployerBetaGroup) {
        subscriptionListsForUser.push({
          activeCampaign: ActiveCampaignListId.EmployerProgramBeta,
          subscriptionCode: SubscriptionCode.employerProgramBeta,
        });
      }
    }

    const { email } = user.emails.find((e) => e.primary);
    // send requests to active campaign with a delay between each
    for (let i = 0; i < subscriptionListsForUser.length; i++) {
      await subscribeContactToList(email, subscriptionListsForUser[i].activeCampaign, client);
      await activateSubscription(user._id, subscriptionListsForUser[i].subscriptionCode);
      await sleep(sleepTime);
    }

    // update the existingWebAppUser field
    // if the user account existed an hour before the marqeta integration, they are an existing user
    let existingWebAppUser: 'true' | 'false' = 'true';
    if (
      !!user?.integrations?.marqeta
      || dayjs(user.dateJoined).isAfter(dayjs(user?.integrations?.marqeta?.created_time).subtract(12, 'hour'))
    ) {
      existingWebAppUser = 'false';
    }

    await updateCustomFields(email, [{ field: ActiveCampaignCustomFields.existingWebAppUser, update: existingWebAppUser }], client);
  } catch (err) {
    console.log(err);
  }
};
