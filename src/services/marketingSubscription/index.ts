import { AxiosInstance } from 'axios';
import dayjs from 'dayjs';
import isemail from 'isemail';
import { FilterQuery, ObjectId, Types, UpdateQuery } from 'mongoose';
import { ActiveCampaignClient } from '../../clients/activeCampaign';
import {
  FieldValues,
  getSubscribedLists,
  removeTagFromUser,
  subscribeContactToList,
  subscribeContactToLists,
  updateActiveCampaignContactData,
  updateCustomFields,
} from '../../integrations/activecampaign';
import { ErrorTypes, UserGroupRole, MiscAppVersionKey, AppVersionEnum, GroupTagsEnum } from '../../lib/constants';
import { ActiveCampaignCustomFields, ActiveCampaignCustomTags } from '../../lib/constants/activecampaign';
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
import { IEmail, IUrlParam } from '../../models/user/types';
import { isExistingWebAppUser, isUserDocument } from '../user/utils';
import { isFreeMembershipUser, updateUserSubscriptions } from './utils';

export interface UserSubscriptions {
  userId: string;
  subscribe: Array<MarketingSubscriptionCode>;
  unsubscribe: Array<MarketingSubscriptionCode>;
}

export interface INewsletterUnsubscribeData {
  email: string;
  resubscribeList: MarketingSubscriptionCode[];
}

export interface IActiveCampaignSubscribeData {
  tags?: string[];
  // user is a paying member
  debitCardholder?: boolean;
  groupName?: string;
  // user is approved but has not paid yet
  unpaidMembership?: boolean;
}

const shareableUnsubscribeError = 'Error processing unsubscribe request.';
const shareableResubscribeError = 'Error processing subscribe request.';

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
    await Promise.all(
      codes.map(async (code) => {
        await MarketingSubscriptionModel.findOneAndUpdate(
          { user: userId, code },
          {
            status: MarketingSubscriptionStatus.Active,
            lastModified: getUtcDate(),
            code,
          },
          { upsert: true },
        );
      }),
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

const _userSource = (user: IUserDocument, params?: IUrlParam[]) => {
  if (!!user?.integrations?.shareasale) return 'sharesale';
  if (!!user?.integrations?.referrals?.params) {
    const sourceParam = params?.find((p) => p.key === 'utm_source');
    if (!!sourceParam) return sourceParam.value;
  }
  return null;
};

export const _buildUserFieldsArray = async (
  user: IUserDocument,
  customFields: Array<{ name: string; id: number }>,
): Promise<FieldValues> => {
  const fields = [];
  const freeMembershipCustomField = customFields.find((field) => field.name === ActiveCampaignCustomFields.isFreeMembershipUser);
  const existingMembershipCustomField = customFields.find((field) => field.name === ActiveCampaignCustomFields.existingWebAppUser);
  const zipCodeField = customFields.find((field) => field.name === ActiveCampaignCustomFields.userZipcode);
  const sourceField = customFields.find((field) => field.name === ActiveCampaignCustomFields.source);
  const zipCode = user?.integrations?.marqeta?.postal_code || user?.zipcode;
  const source = _userSource(user);
  if (freeMembershipCustomField?.id) {
    fields.push({ id: freeMembershipCustomField.id, value: !!(await isFreeMembershipUser(user)) ? 'true' : 'false' });
  }
  if (existingMembershipCustomField?.id) {
    fields.push({ id: existingMembershipCustomField.id, value: !!isExistingWebAppUser(user) ? 'true' : 'false' });
  }
  if (!!zipCode && !!zipCodeField?.id) fields.push({ id: zipCodeField.id, value: zipCode });
  if (!!source && !!sourceField?.id) fields.push({ id: sourceField.id, value: source });
  return fields;
};

export const _buildSubscribeArray = async (
  subscribeArray: ActiveCampaignListId[],
  additionalData: IActiveCampaignSubscribeData,
): Promise<ActiveCampaignListId[]> => {
  // Everyone should be subscribed to the general updates list
  subscribeArray.push(ActiveCampaignListId.GeneralUpdates);

  if (!!additionalData?.debitCardholder) {
    // Paid Membership, subscribe to DebitCardholders
    subscribeArray.push(ActiveCampaignListId.DebitCardHolders);
    if (!!additionalData?.groupName) subscribeArray.push(ActiveCampaignListId.GroupMembers);
  } else if (!additionalData.debitCardholder && !additionalData.unpaidMembership) {
    // Regular user with free product, subscribe to Web Account Updates
    subscribeArray.push(ActiveCampaignListId.AccountUpdates);
  }
  return subscribeArray;
};

export const _updateVisitorSubscriptionsForNewUser = async (user: IUserDocument, visitor: IVisitorDocument) => {
  // associate subscriptions with new user
  await MarketingSubscriptionModel.updateMany({ visitor: visitor._id }, { $set: { user: user._id, lastModified: getUtcDate() } });
};

export const addMarketingSubscriptionsForNewUser = async (user: IUserDocument, subscriptions: ActiveCampaignListId[]) => {
  for (const sub of subscriptions) {
    const existingSub = await MarketingSubscriptionModel.findOne({ user: user._id, code: ProviderProductIdToMarketingSubscriptionCode[sub] });
    if (!!existingSub) continue;
    await MarketingSubscriptionModel.create({
      code: ProviderProductIdToMarketingSubscriptionCode[sub],
      user: user._id,
      status: MarketingSubscriptionStatus.Active,
    });
  }
};

export const removeMarketingSubscriptionsForUser = async (user: IUserDocument, subscriptions: ActiveCampaignListId[]) => {
  for (const sub of subscriptions) {
    await MarketingSubscriptionModel.findOneAndUpdate(
      {
        user: user._id,
        code: ProviderProductIdToMarketingSubscriptionCode[sub],
      },
      {
        status: MarketingSubscriptionStatus.Cancelled,
        lastModified: getUtcDate(),
      },
    );
  }
};

export const hasMarketingSubscription = async (user: IUserDocument, code: MarketingSubscriptionCode): Promise<boolean> => {
  const existingSubscription = await MarketingSubscriptionModel.findOne({ user: user._id, code });
  return !!existingSubscription;
};

export const updateNewUserSubscriptions = async (
  user: IUserDocument,
  userSubscribeData?: IActiveCampaignSubscribeData,
) => {
  const { email } = user.emails.find((e) => e.primary);
  const { tags, debitCardholder } = userSubscribeData || {};
  const visitor = await VisitorModel.findOne({ email });
  if (!!visitor) {
    // changes the visitor id to user id
    await _updateVisitorSubscriptionsForNewUser(user, visitor);
  }
  const ac = new ActiveCampaignClient();
  const customFields = await ac.getCustomFieldIDs();
  const fieldsArray = await _buildUserFieldsArray(user, customFields);
  let subscribe: ActiveCampaignListId[] = [];
  let unsubscribe: ActiveCampaignListId[] = [];
  subscribe = await _buildSubscribeArray(subscribe, userSubscribeData || {});
  // User is a paying member
  if (!!debitCardholder) {
    await removeTagFromUser(user, ActiveCampaignCustomTags.MembershipUnpaid);
    const hasExistingWebSubscription = await hasMarketingSubscription(user, MarketingSubscriptionCode.accountUpdates);
    if (hasExistingWebSubscription) {
      await updateCustomFields(email, [{ field: ActiveCampaignCustomFields.existingWebAppUser, update: 'true' }]);
      await removeTagFromUser(user, ActiveCampaignCustomTags.KWWebApp);
      unsubscribe = [ActiveCampaignListId.AccountUpdates];
      await removeMarketingSubscriptionsForUser(user, unsubscribe);
    }
  }

  await addMarketingSubscriptionsForNewUser(user, subscribe);
  await updateActiveCampaignContactData({ email, name: user?.name }, subscribe, unsubscribe, tags, fieldsArray);
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
    }
    : {
      visitor: id,
    };
  if (activeCampaignSubs && activeCampaignSubs.length > 0) {
    for (const sub of activeCampaignSubs) {
      await MarketingSubscriptionModel.findOneAndUpdate(
        {
          ...subscribeFilter,
          code: ProviderProductIdToMarketingSubscriptionCode[sub],
        },
        {
          ...subscribeFilter,
          lastModified: getUtcDate(),
          status: MarketingSubscriptionStatus.Active,
          code: ProviderProductIdToMarketingSubscriptionCode[sub],
        },
        { upsert: true },
      );
    }
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
  entity: IUserDocument | IVisitorDocument,
  groupToBeDeleted?: ObjectId,
): Promise<UserSubscriptions> => {
  try {
    const userSub: UserSubscriptions = {
      userId: entity._id.toString(),
      subscribe: [],
      unsubscribe: [],
    };

    const isUser = isUserDocument(entity);
    const email = isUser ? entity?.emails?.find((e: IEmail) => e.primary)?.email : entity.email;
    if (!email) {
      console.log(JSON.stringify(entity));
      return userSub;
    }

    // get active campaign subscrtiptions for this email
    const activeCampaignListIds = await getActiveCampaignSubscribedListIds(email);

    // add ids of any active subs not from active campaign
    const nonActiveCampaignSubs = await getNonActiveCampaignSubscriptions(entity._id as unknown as Types.ObjectId);

    // update db with active campaign subscriptions
    await reconcileActiveCampaignListSubscriptions(new Types.ObjectId(entity._id.toString()), activeCampaignListIds, nonActiveCampaignSubs);

    /* Should the user be enrolled in the admin list? */
    const adminQuery: FilterQuery<IUserGroup> = {
      $and: [
        { user: entity._id },
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
      $and: [{ user: entity._id }, { status: { $nin: [UserGroupStatus.Left, UserGroupStatus.Banned, UserGroupStatus.Removed] } }],
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
      groupUsers.map(async (userGroup) => getUserGroupSubscriptionsToUpdate(userGroup.user as IUserDocument, groupToBeDeleted ? group._id : undefined)),
    );

    userSubscriptions = userSubscriptions.filter((sub) => sub.subscribe.length > 0 || sub.unsubscribe.length > 0);
    return userSubscriptions || [];
  } catch (err) {
    console.error('Error generating subscription list', err);
  }
};

// Check that the subscription code is valid and maps to a valid provider product id
export const marketingSubscriptionCodesAreValid = (codes: MarketingSubscriptionCode[]): boolean => {
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

const subscriptionCodeToActiveCampaignId = (mapping: Record<ActiveCampaignListId, MarketingSubscriptionCode>): Record<MarketingSubscriptionCode, ActiveCampaignListId> => Object.entries(mapping).reduce(
  (acc, [key, value]) => {
    acc[value as MarketingSubscriptionCode] = key as ActiveCampaignListId;
    return acc;
  },
  {} as Record<MarketingSubscriptionCode, ActiveCampaignListId>,
);

const subscribeToActiveCampaignNewsletters = async (email: string, resubscribeList: MarketingSubscriptionCode[]) => {
  // get active campaign ids from subscription codes
  const activeCampaignListIdsToSubscribe: ActiveCampaignListId[] = resubscribeList.map(
    (marketingSubscriptionCode) => subscriptionCodeToActiveCampaignId(ProviderProductIdToMarketingSubscriptionCode)[marketingSubscriptionCode],
  );

  // update db subscriptions
  const update: UpdateQuery<IMarketingSubscription> = {
    $set: {
      status: MarketingSubscriptionStatus.Active,
      lastModified: getUtcDate(),
    },
  };
  const filter: FilterQuery<IMarketingSubscription> = {
    code: { $in: resubscribeList },
  };

  const user = await getUserByEmail(email);
  const visitor = await getVisitorByEmail(email);
  if (!!user) {
    filter.user = user._id;
  } else if (!!visitor) {
    filter.visitor = visitor._id;
  } else {
    throw new CustomError(shareableResubscribeError, ErrorTypes.UNPROCESSABLE);
  }
  await updateSubscriptionsByQuery(filter, update);

  // subscribe in active campaign
  await subscribeContactToLists(email, activeCampaignListIdsToSubscribe);
};

const unsubcribeFromAllActiveCampaignNewsletters = async (email: string) => {
  // get active campaign subscriptions for this email
  const activeCampaignListIds = await getActiveCampaignSubscribedListIds(email);
  if (!activeCampaignListIds || activeCampaignListIds.length <= 0) {
    // user has no active subscriptions
    throw new CustomError('No active subscriptions.', ErrorTypes.UNPROCESSABLE);
  }

  // update db subscriptions
  const subscriptionCodesToUnsubscribe: MarketingSubscriptionCode[] = activeCampaignListIds.map(
    (providerProductId) => ProviderProductIdToMarketingSubscriptionCode[providerProductId],
  );
  if (!subscriptionCodesToUnsubscribe || subscriptionCodesToUnsubscribe?.length <= 0) {
    throw new CustomError(shareableUnsubscribeError, ErrorTypes.UNPROCESSABLE);
  }

  const update: UpdateQuery<IMarketingSubscription> = {
    $set: {
      status: MarketingSubscriptionStatus.Cancelled,
      lastModified: getUtcDate(),
    },
  };
  const filter: FilterQuery<IMarketingSubscription> = {
    code: { $in: subscriptionCodesToUnsubscribe },
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
  await unsubscribeFromActiveCampaignNewsletters(email, activeCampaignListIds);
};

export const newsletterUnsubscribe = async (_: IRequest, email: string, resubscribeList: MarketingSubscriptionCode[]) => {
  try {
    if (!email || !isemail.validate(email, { minDomainAtoms: 2 })) {
      throw new CustomError('Invalid email format.', ErrorTypes.INVALID_ARG);
    }
    email = email.toLowerCase();

    const shouldResubscribe = !!resubscribeList && resubscribeList.length > 0;

    if (shouldResubscribe) {
      if (!marketingSubscriptionCodesAreValid(resubscribeList)) {
        throw new CustomError(shareableResubscribeError, ErrorTypes.GEN);
      }
      await subscribeToActiveCampaignNewsletters(email, resubscribeList);
    } else {
      await unsubcribeFromAllActiveCampaignNewsletters(email);
    }
  } catch (err) {
    console.log('Error updating newsletter subscriptions.', err);
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
