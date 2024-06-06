import { AxiosInstance } from 'axios';
import dayjs from 'dayjs';
import isemail from 'isemail';
import { FilterQuery, ObjectId, Types, UpdateQuery } from 'mongoose';
import { ActiveCampaignClient } from '../../clients/activeCampaign';
import {
  getSubscribedLists,
  subscribeContactToList,
  updateActiveCampaignContactData,
  updateCustomFields,
} from '../../integrations/activecampaign';
import { ErrorTypes, UserGroupRole, MiscAppVersionKey, AppVersionEnum, GroupTagsEnum, DateKarmaMembershipStoppedbBeingFree } from '../../lib/constants';
import { ActiveCampaignCustomFields } from '../../lib/constants/activecampaign';
import { ProviderProductIdToMarketingSubscriptionCode, MarketingSubscriptionCodeToProviderProductId } from '../../lib/constants/marketing_subscription';
import CustomError from '../../lib/customError';
import { getUtcDate } from '../../lib/date';
import { sleep } from '../../lib/misc';
import { GroupModel, IGroupDocument } from '../../models/group';
import { MiscModel } from '../../models/misc';
import { IMarketingSubscription, MarketingSubscriptionModel } from '../../models/marketingSubscription';
import { IUserDocument, UserModel } from '../../models/user';
import { IUserGroup, UserGroupModel } from '../../models/userGroup';
import { IVisitorDocument, VisitorModel } from '../../models/visitor';
import { UserGroupStatus } from '../../types/groups';
import { IRequest } from '../../types/request';
import { ActiveCampaignListId, MarketingSubscriptionCode, MarketingSubscriptionStatus } from '../../types/marketing_subscription';
import { IUser, IEmail } from '../../models/user/types';

export interface UserSubscriptions {
  userId: string;
  subscribe: Array<MarketingSubscriptionCode>;
  unsubscribe: Array<MarketingSubscriptionCode>;
}

export interface INewsletterUnsubscribeData {
  email: string;
  preserveSubscriptions: MarketingSubscriptionCode[];
}

export interface IActiveCampaignSubscribeData {
  tags?: string[];
  debitCardholder?: boolean;
  groupName?: string;
  employerBeta?: boolean;
  beta?: boolean;
}

const shareableUnsubscribeError = 'Error processing unsubscribe request.';

export const cancelUserSubscriptions = async (userId: string, codes: MarketingSubscriptionCode[]) => {
  try {
    await MarketingSubscriptionModel.updateMany(
      { user: userId, code: { $in: codes } },
      {
        status: MarketingSubscriptionStatus.Cancelled,
        lastModified: getUtcDate(),
      },
    );
  } catch (err) {
    console.error('Error canceling subscription', err);
    throw new CustomError(shareableUnsubscribeError, ErrorTypes.SERVER);
  }
};

const activateSubscriptions = async (userId: Types.ObjectId, codes: MarketingSubscriptionCode[]) => {
  try {
    await MarketingSubscriptionModel.updateMany(
      { user: userId, code: { $in: codes } },
      {
        status: MarketingSubscriptionStatus.Active,
        lastModified: getUtcDate(),
      },
      { upsert: true },
    );
  } catch (err) {
    console.error('Error activating subscription', err);
    throw new CustomError(shareableUnsubscribeError, ErrorTypes.SERVER);
  }
};

export const subscribeToDebitCardholderList = async (user: IUserDocument) => {
  const { email } = user.emails.find((e) => e.primary);
  const subscribe = [ActiveCampaignListId.DebitCardHolders];
  await updateActiveCampaignContactData({ email, name: user.name }, subscribe, []);
  await MarketingSubscriptionModel.create({
    code: MarketingSubscriptionCode.debitCardHolders,
    user: user._id,
    status: MarketingSubscriptionStatus.Active,
  });
};

export const updateNewUserSubscriptions = async (user: IUserDocument, additionalData?: IActiveCampaignSubscribeData) => {
  const { email } = user.emails.find((e) => e.primary);
  const visitor = await VisitorModel.findOneAndUpdate({ email }, { user: user._id }, { new: true });
  const { tags, debitCardholder, groupName, employerBeta, beta } = additionalData || {};
  let subscribe: ActiveCampaignListId[] = [];
  let unsubscribe: ActiveCampaignListId[] = [];

  const ac = new ActiveCampaignClient();
  const customFields = await ac.getCustomFieldIDs();
  const existingWebAppUserCustomField = customFields.find(
    (field) => field.name === ActiveCampaignCustomFields.existingWebAppUser,
  );

  let existingWebAppUser = 'false';
  if (
    !!user?.integrations?.marqeta
    && dayjs(user?.integrations?.marqeta?.created_time).subtract(12, 'hour').isAfter(dayjs(user.dateJoined))
  ) {
    existingWebAppUser = 'true';
  }

  const isFreeMembershipUserCustomField = customFields.find(
    (field) => field.name === ActiveCampaignCustomFields.isFreeMembershipUser,
  );
  const isFreeMembershipUser = !!user?.integrations?.marqeta?.created_time
    ? dayjs(user.integrations.marqeta.created_time).isBefore(DateKarmaMembershipStoppedbBeingFree)
    : false;

  const fields = [{ id: isFreeMembershipUserCustomField.id, value: isFreeMembershipUser.toString() }];

  if (!!existingWebAppUserCustomField?.id) {
    fields.push({ id: existingWebAppUserCustomField?.id, value: existingWebAppUser });
  }

  if (!!visitor) {
    unsubscribe = [ActiveCampaignListId.MonthyNewsletters];

    // check if they are receiving the general updates newsletter and add it if not
    const sub = await MarketingSubscriptionModel.findOne({
      visitor: visitor._id,
      code: MarketingSubscriptionCode.generalUpdates,
    });

    // add them to general update if they are not receiving yet
    if (!(sub?.status === MarketingSubscriptionStatus.Active)) {
      subscribe.push(ActiveCampaignListId.GeneralUpdates);
    }

    // Joined Web App flow
    if (!debitCardholder) {
      // add to web account updates
      subscribe.push(ActiveCampaignListId.AccountUpdates);

      await updateActiveCampaignContactData({ email, name: user?.name }, subscribe, unsubscribe, tags, fields || []);
    } else {
      // Debit Card Holder flow
      subscribe.push(ActiveCampaignListId.DebitCardHolders);
      if (!!groupName) subscribe.push(ActiveCampaignListId.GroupMembers);
      if (!!employerBeta) {
        subscribe.push(ActiveCampaignListId.EmployerProgramBeta);
      }
      if (!!beta) subscribe.push(ActiveCampaignListId.BetaTesters);
      try {
        await updateActiveCampaignContactData({ email, name: user?.name }, subscribe, unsubscribe, tags, fields || []);
      } catch (err) {
        console.error('Error subscribing user to lists', err);
      }
    }

    await MarketingSubscriptionModel.findOneAndUpdate(
      { visitor: visitor._id, code: MarketingSubscriptionCode.monthlyNewsletters },
      { status: MarketingSubscriptionStatus.Cancelled },
    );

    // associate subscriptions with new user
    await MarketingSubscriptionModel.updateMany({ visitor: visitor._id }, { $set: { user: user._id, lastModified: getUtcDate() } });
    await MarketingSubscriptionModel.create({
      code: MarketingSubscriptionCode.accountUpdates,
      user: user._id,
      visitor: visitor?._id,
      status: MarketingSubscriptionStatus.Active,
    });

    // findOne with upsert instead of create because they may have already subscribed to the newsletter
    await MarketingSubscriptionModel.findOne(
      {
        code: MarketingSubscriptionCode.generalUpdates,
        user: user._id,
        visitor: visitor?._id,
        status: MarketingSubscriptionStatus.Active,
      },
      {},
      { upsert: true },
    );
  } else {
    // if no visitor then we do not need to update any subscriptions, we just need to subscribe the user
    if (!debitCardholder) {
      subscribe = [ActiveCampaignListId.AccountUpdates, ActiveCampaignListId.GeneralUpdates];
      await updateActiveCampaignContactData({ email, name: user?.name }, subscribe, unsubscribe, [], fields);

      await MarketingSubscriptionModel.create({
        code: MarketingSubscriptionCode.accountUpdates,
        user: user._id,
        visitor: visitor?._id,
        status: MarketingSubscriptionStatus.Active,
      });
      // findOne with upsert instead of create because they may have already subscribed to the newsletter
      await MarketingSubscriptionModel.findOne(
        {
          code: MarketingSubscriptionCode.generalUpdates,
          user: user._id,
          visitor: visitor?._id,
          status: MarketingSubscriptionStatus.Active,
        },
        {},
        { upsert: true },
      );
    } else {
      unsubscribe = [ActiveCampaignListId.MonthyNewsletters];
      subscribe.push(ActiveCampaignListId.GeneralUpdates);
      subscribe.push(ActiveCampaignListId.DebitCardHolders);
      if (!!groupName) subscribe.push(ActiveCampaignListId.GroupMembers);
      if (!!employerBeta) {
        subscribe.push(ActiveCampaignListId.EmployerProgramBeta);
      }
      if (!!beta) subscribe.push(ActiveCampaignListId.BetaTesters);
      try {
        const res = await updateActiveCampaignContactData({ email, name: user?.name }, subscribe, unsubscribe, tags || []);
        console.log('///// response from update active vampaign', res);
      } catch (err) {
        console.error('Error subscribing user to lists', err);
      }
    }
  }
  try {
    return await activateSubscriptions(
      user._id,
      subscribe.map((listId) => ProviderProductIdToMarketingSubscriptionCode[listId]),
    );
  } catch (err) {
    console.log(err);
  }
  try {
    await cancelUserSubscriptions(
      user._id,
      unsubscribe.map((listId) => ProviderProductIdToMarketingSubscriptionCode[listId]),
    );
  } catch (err) {
    console.log(err);
  }
};

export const getActiveCampaignSubscribedListIds = async (email: string, client?: AxiosInstance): Promise<ActiveCampaignListId[]> => {
  try {
    return await getSubscribedLists(email, client);
  } catch (err) {
    throw new CustomError(shareableUnsubscribeError, ErrorTypes.SERVER);
  }
};

export const getActiveCampaignSubscribedMarketingSubscriptionCodes = async (email: string): Promise<MarketingSubscriptionCode[]> => {
  const listIds = await getActiveCampaignSubscribedListIds(email);
  return listIds.map((id) => ProviderProductIdToMarketingSubscriptionCode[id]);
};

export const subscribeToList = async (userId: Types.ObjectId, code: MarketingSubscriptionCode): Promise<void> => {
  try {
    await MarketingSubscriptionModel.findOneAndUpdate(
      { user: userId, code },
      {
        user: userId,
        code,
        status: MarketingSubscriptionStatus.Active,
        lastModified: getUtcDate(),
      },
      { upsert: true },
    );
  } catch (err) {
    console.error('Error subscribing to list', err);
    throw new CustomError(shareableUnsubscribeError, ErrorTypes.SERVER);
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

export const cancelAllUserSubscriptions = async (userId: string) => {
  try {
    const subs = await MarketingSubscriptionModel.find({ user: userId }).lean();
    const unsubscribe = subs?.map((sub) => sub.code);

    if (unsubscribe?.length > 0) {
      await updateUserSubscriptions(userId, [], unsubscribe);
    }
  } catch (err) {
    console.error('Error canceling subscription', err);
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
export const reconcileActiveCampaignListSubscriptions = async (
  id: Types.ObjectId,
  activeCampaignSubs: ActiveCampaignListId[],
  subCodes: MarketingSubscriptionCode[] = [],
  visitor: boolean = false,
) => {
  // get a list of all active campaign subscription codes
  const activeCampaignSubCodes = Object.values(ActiveCampaignListId).map((listId) => ProviderProductIdToMarketingSubscriptionCode[listId]);
  const codes = activeCampaignSubs?.map((sub) => ProviderProductIdToMarketingSubscriptionCode[sub])?.concat(subCodes) || subCodes;

  /* update any activeCampaignSubs in subs to Active -- with upsert */
  const subscribeFilter: FilterQuery<IMarketingSubscription> = visitor
    ? {
      user: id,
      code: { $in: codes },
    }
    : {
      visitor: id,
      code: { $in: codes },
    };
  if (activeCampaignSubs && activeCampaignSubs.length > 0) {
    await MarketingSubscriptionModel.updateMany(
      subscribeFilter,
      {
        lastModified: getUtcDate(),
        status: MarketingSubscriptionStatus.Active,
      },
      { upsert: true },
    );
  }

  /* update any activeCampaignSubs not in subs to cancelled -- no upsert */
  const cancelFilter: FilterQuery<IMarketingSubscription> = visitor
    ? {
      $and: [{ visitor: id }, { code: { $in: activeCampaignSubCodes } }, { code: { $nin: codes } }],
    }
    : {
      $and: [{ user: id }, { code: { $in: activeCampaignSubCodes } }, { code: { $nin: codes } }],
    };

  await MarketingSubscriptionModel.updateMany(cancelFilter, {
    lastModified: getUtcDate(),
    status: MarketingSubscriptionStatus.Cancelled,
  });
};

export const getNonActiveCampaignSubscriptions = async (userId: Types.ObjectId): Promise<MarketingSubscriptionCode[]> => {
  const nonActiveCampaignSubs = await MarketingSubscriptionModel.find({
    user: userId,
    code: { $nin: Object.values(ActiveCampaignListId).map((id) => ProviderProductIdToMarketingSubscriptionCode[id]) },
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
        userSub.subscribe.push(MarketingSubscriptionCode.groupAdmins);
      }
    } else if (!!activeCampaignListIds && activeCampaignListIds.includes(ActiveCampaignListId.GroupAdmins)) {
      userSub.unsubscribe.push(MarketingSubscriptionCode.groupAdmins);
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
        userSub.subscribe.push(MarketingSubscriptionCode.groupMembers);
      }
    } else if (!!activeCampaignListIds && activeCampaignListIds.includes(ActiveCampaignListId.GroupMembers)) {
      userSub.unsubscribe.push(MarketingSubscriptionCode.groupMembers);
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
export const MarketingSubscriptionCodesAreValid = (codes: MarketingSubscriptionCode[]): boolean => {
  if (!codes || codes.length === 0) return false;
  let codesAreValid = true;
  codes?.forEach((code) => {
    const c = MarketingSubscriptionCode[code];
    if (!MarketingSubscriptionCode[code]) {
      codesAreValid = false;
      return;
    }
    const productId = MarketingSubscriptionCodeToProviderProductId[c] as ActiveCampaignListId;
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

const updateSubscriptionsByQuery = async (query: FilterQuery<IMarketingSubscription>, update: UpdateQuery<IMarketingSubscription>) => {
  try {
    return await MarketingSubscriptionModel.updateMany(query, update);
  } catch (err) {
    console.error('Error searching for subscription:', err);
    throw new CustomError(shareableUnsubscribeError, ErrorTypes.SERVER);
  }
};

const unsubscribeFromActiveCampaignNewsletters = async (email: string, unsubscribe: ActiveCampaignListId[]) => {
  try {
    await updateActiveCampaignContactData({ email }, [], unsubscribe);
  } catch (err) {
    console.error(`Error unsubscribing contact with email ${email} from newsletters:`, err);
    throw new CustomError(shareableUnsubscribeError, ErrorTypes.SERVER);
  }
};

export const newsletterUnsubscribe = async (_: IRequest, email: string, preserveSubscriptions: MarketingSubscriptionCode[]) => {
  try {
    if (!email || !isemail.validate(email, { minDomainAtoms: 2 })) {
      throw new CustomError('Invalid email format.', ErrorTypes.INVALID_ARG);
    }
    email = email.toLowerCase();

    if (!!preserveSubscriptions && preserveSubscriptions?.length > 0) {
      if (!MarketingSubscriptionCodesAreValid(preserveSubscriptions)) {
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
      (providerProductId) => !preserveSubscriptions.includes(ProviderProductIdToMarketingSubscriptionCode[providerProductId]),
    );

    // update db subscriptions
    const unsubscribe: MarketingSubscriptionCode[] = unsubscribeLists.map(
      (providerProductId) => ProviderProductIdToMarketingSubscriptionCode[providerProductId],
    );
    if (!unsubscribe || unsubscribe?.length <= 0) {
      throw new CustomError(shareableUnsubscribeError, ErrorTypes.UNPROCESSABLE);
    }

    const update: UpdateQuery<IMarketingSubscription> = {
      $set: {
        status: MarketingSubscriptionStatus.Cancelled,
        lastModified: getUtcDate(),
      },
    };
    const filter: FilterQuery<IMarketingSubscription> = {
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

    const subscriptionListsForUser: { activeCampaign: ActiveCampaignListId; MarketingSubscriptionCode: MarketingSubscriptionCode }[] = [];

    // check if they're in the beta invite list
    const inBetaInviteList = userContactLists?.includes(ActiveCampaignListId.BetaTesterInvite);
    const isInBetaTestersList = userContactLists?.includes(ActiveCampaignListId.BetaTesters);

    if (!!inBetaInviteList && !isInBetaTestersList && appVersion.value === AppVersionEnum.Beta) {
      // add them to the beta testers list
      subscriptionListsForUser.push({ activeCampaign: ActiveCampaignListId.BetaTesters, MarketingSubscriptionCode: MarketingSubscriptionCode.betaTesters });
    }

    // if the app is in v1, add them to the debit card holders list
    const isInDebitCardHoldersList = userContactLists?.includes(ActiveCampaignListId.DebitCardHolders);
    if (appVersion.value === AppVersionEnum.V1 && !isInDebitCardHoldersList) {
      subscriptionListsForUser.push({
        activeCampaign: ActiveCampaignListId.DebitCardHolders,
        MarketingSubscriptionCode: MarketingSubscriptionCode.debitCardHolders,
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
          MarketingSubscriptionCode: MarketingSubscriptionCode.employerProgramBeta,
        });
      }
    }

    const { email } = user.emails.find((e) => e.primary);
    // send requests to active campaign with a delay between each
    for (let i = 0; i < subscriptionListsForUser.length; i++) {
      await subscribeContactToList(email, subscriptionListsForUser[i].activeCampaign, client);
      await activateSubscriptions(user._id, [subscriptionListsForUser[i].MarketingSubscriptionCode]);
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
