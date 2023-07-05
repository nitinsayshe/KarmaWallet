import { AxiosInstance } from 'axios';
import dayjs from 'dayjs';
import { Schema, Types } from 'mongoose';
import { ActiveCampaignClient, IContactAutomation, IContactList, IGetContactResponse } from '../../clients/activeCampaign';
import { CardStatus } from '../../lib/constants';
import { ActiveCampaignCustomFields } from '../../lib/constants/activecampaign';
import { SubscriptionCodeToProviderProductId } from '../../lib/constants/subscription';
import {
  getAvailableCommissionPayouts,
  getMonthlyCommissionTotal,
  getMonthlyLoginCount,
  getTotalLoginCount,
  getWeeklyLoginCount,
  getYearlyCommissionTotal,
  getYearlyEmissionsTotal,
  getYearlyKarmaScore,
  getYearlyLoginCount,
} from '../../services/user/utils/metrics';
import { CardModel } from '../../models/card';
import { CommissionModel } from '../../models/commissions';
import { CompanyModel } from '../../models/company';
import { GroupModel, IGroup, IGroupDocument, IShareableGroup } from '../../models/group';
import { IUserDocument, UserModel } from '../../models/user';
import { IShareableUserGroup, IUserGroupDocument, UserGroupModel } from '../../models/userGroup';
import { UserLogModel } from '../../models/userLog';
import { UserMontlyImpactReportModel } from '../../models/userMonthlyImpactReport';
import { UserGroupStatus } from '../../types/groups';
import { IRef } from '../../types/model';
import { ActiveCampaignListId, SubscriptionCode } from '../../types/subscription';

export type FieldIds = Array<{ name: string; id: number }>;
export type FieldValues = Array<{ id: number; value: string }>;

interface ISubscriptionLists {
  subscribe: Array<{ listid: ActiveCampaignListId }>;
  unsubscribe: Array<{ listid: ActiveCampaignListId }>;
}

export interface UserLists {
  userId: string;
  email: string;
  lists: ISubscriptionLists;
}

export interface UserSubscriptions {
  userId: string;
  subscribe: Array<SubscriptionCode>;
  unsubscribe: Array<SubscriptionCode>;
}

export type CustomFieldSetter = (
  userId: string,
  customFields: FieldIds,
  fieldValues?: FieldValues
) => Promise<FieldValues>;

// duplicated code to avoid circular dependency
const getShareableUserGroupFromUserGroupDocument = ({
  _id,
  group,
  email,
  role,
  status,
  joinedOn,
}: IUserGroupDocument): IShareableUserGroup & { _id: string } => {
  let _group: IRef<Schema.Types.ObjectId, IShareableGroup | IGroup> = group;
  if (!!(_group as IGroupDocument)?.name) {
    _group = {
      _id,
      name: (_group as IGroupDocument).name,
      code: (_group as IGroupDocument).code,
      domains: (_group as IGroupDocument).domains,
      logo: (_group as IGroupDocument).logo,
      settings: (_group as IGroupDocument).settings,
      status: (_group as IGroupDocument).status,
      owner: {
        _id: ((_group as IGroupDocument).owner as IUserDocument)._id,
        name: ((_group as IGroupDocument).owner as IUserDocument).name,
      },
      totalMembers: (_group as IGroupDocument).members?.length || null,
      lastModified: (_group as IGroupDocument).lastModified,
      createdOn: (_group as IGroupDocument).createdOn,
    } as IShareableGroup & { _id: string };
  }

  return {
    _id,
    email,
    role,
    status,
    joinedOn,
    group: _group,
  };
};

export const setLinkedCardData: CustomFieldSetter = async (
  userId: string,
  customFields: FieldIds,
  fieldValues?: FieldValues,
): Promise<FieldValues> => {
  if (!customFields) {
    console.log('No custom fields provided');
    return fieldValues;
  }
  if (!fieldValues) {
    fieldValues = [];
  }

  // get linked card data
  try {
    const cards = await CardModel.find({
      userId,
      status: CardStatus.Linked,
    })
      .lean()
      .sort({ createdOn: 1 });

    let customField = customFields.find((field) => field.name === ActiveCampaignCustomFields.hasLinkedCard);
    if (customField) {
      if (cards.length > 0) {
        fieldValues.push({ id: customField.id, value: 'true' });

        customField = customFields.find((field) => field.name === ActiveCampaignCustomFields.lastLinkedCardDate);
        if (!!customField && cards[cards.length - 1]?.createdOn) {
          fieldValues.push({ id: customField.id, value: cards[cards.length - 1].createdOn.toISOString() });
        }

        customField = customFields.find((field) => field.name === ActiveCampaignCustomFields.firstLinkedCardDate);
        if (!!customField && cards[0]?.createdOn) {
          fieldValues.push({ id: customField.id, value: cards[0].createdOn.toISOString() });
        }
      } else {
        fieldValues.push({ id: customField.id, value: 'false' });
      }
    }

    customField = customFields.find((field) => field.name === ActiveCampaignCustomFields.numLinkedCards);
    if (!!customField) {
      fieldValues.push({ id: customField.id, value: cards.length.toString() });
    }
  } catch (err) {
    console.error('error getting linked card data', err);
  }
  return fieldValues;
};

export const prepareLinkedAccountFields = async (
  user: IUserDocument,
  customFields: FieldIds,
  fieldValues: FieldValues,
): Promise<FieldValues> => {
  if (!customFields) {
    console.log('No custom fields provided');
    return fieldValues;
  }
  if (!fieldValues) {
    fieldValues = [];
  }

  fieldValues = await setLinkedCardData(user._id, customFields, fieldValues);
  return fieldValues;
};

export const prepareYearlyUpdatedFields = async (
  user: IUserDocument,
  customFields: FieldIds,
  fieldValues: FieldValues,
): Promise<FieldValues> => {
  if (!customFields) {
    console.log('No custom fields provided');
    return fieldValues;
  }
  if (!fieldValues) {
    fieldValues = [];
  }
  let customField = customFields.find((field) => field.name === ActiveCampaignCustomFields.cashbackDollarsEarnedYearly);
  if (!!customField) {
    const yearlyCommissionTotal = await getYearlyCommissionTotal(user);
    fieldValues.push({ id: customField.id, value: yearlyCommissionTotal.toFixed(2) });
  }

  customField = customFields.find((field) => field.name === ActiveCampaignCustomFields.carbonEmissionsYearly);
  if (!!customField) {
    const yearlyEmissionsTotal = await getYearlyEmissionsTotal(user);
    fieldValues.push({ id: customField.id, value: yearlyEmissionsTotal.toFixed(2) });
  }

  customField = customFields.find((field) => field.name === ActiveCampaignCustomFields.karmaScoreYearly);
  if (!!customField) {
    const yearlyKarmaScore = await getYearlyKarmaScore(user);
    fieldValues.push({ id: customField.id, value: yearlyKarmaScore.toFixed(0) });
  }
  return fieldValues;
};

export const prepareQuarterlyUpdatedFields = async (
  user: IUserDocument,
  customFields: FieldIds,
  fieldValues: FieldValues,
): Promise<FieldValues> => {
  if (!customFields) {
    console.log('No custom fields provided');
    return fieldValues;
  }
  if (!fieldValues) {
    fieldValues = [];
  }
  return fieldValues;
};

export const prepareMonthlyUpdatedFields = async (
  user: IUserDocument,
  customFields: FieldIds,
  fieldValues: FieldValues,
): Promise<FieldValues> => {
  if (!customFields) {
    console.log('No custom fields provided');
    return fieldValues;
  }
  if (!fieldValues) {
    fieldValues = [];
  }
  const impactReport = await UserMontlyImpactReportModel.findOne({ user }).sort({ date: -1 });

  let customField = customFields.find((field) => field.name === ActiveCampaignCustomFields.loginCountLastYear);

  if (!!customField) {
    const yearlyLoginCount = await getYearlyLoginCount(user);
    fieldValues.push({ id: customField.id, value: yearlyLoginCount.toString() });
  }
  customField = customFields.find((field) => field.name === ActiveCampaignCustomFields.monthsKarmaScore);
  if (!!customField && !!impactReport?.impact?.score) {
    const score = impactReport.impact.score.toFixed(0);
    fieldValues.push({ id: customField.id, value: score });
  }
  customField = customFields.find((field) => field.name === ActiveCampaignCustomFields.impactneutral);
  if (!!customField && !!impactReport?.impact?.neutral) {
    const neutral = impactReport.impact.neutral.toFixed(0);
    fieldValues.push({ id: customField.id, value: neutral });
  }

  customField = customFields.find((field) => field.name === ActiveCampaignCustomFields.impactpositive);
  if (!!customField && !!impactReport?.impact?.positive) {
    const positive = impactReport.impact.positive.toFixed(0);
    fieldValues.push({ id: customField.id, value: positive });
  }
  customField = customFields.find((field) => field.name === ActiveCampaignCustomFields.impactnegative);
  if (!!customField && !!impactReport?.impact?.negative) {
    const negative = impactReport.impact.negative.toFixed(0);
    fieldValues.push({ id: customField.id, value: negative });
  }
  customField = customFields.find((field) => field.name === ActiveCampaignCustomFields.carbonEmissionsMonthly);
  if (!!customField && !!impactReport?.carbon?.monthlyEmissions) {
    const monthlyEmissions = impactReport.carbon.monthlyEmissions.toFixed(2) || '0';
    fieldValues.push({ id: customField.id, value: monthlyEmissions });
  }

  customField = customFields.find((field) => field.name === ActiveCampaignCustomFields.carbonOffsetTonnes);
  if (!!customField && !!impactReport?.carbon?.offsets?.totalOffset) {
    const totalOffset = impactReport.carbon.offsets.totalOffset.toFixed(2) || '0';
    fieldValues.push({ id: customField.id, value: totalOffset });
  }

  customField = customFields.find((field) => field.name === ActiveCampaignCustomFields.carbonOffsetDollars);
  if (!!customField && !!impactReport?.carbon?.offsets?.totalDonated) {
    const totalDonated = impactReport.carbon.offsets.totalDonated.toFixed(2) || '0';
    fieldValues.push({ id: customField.id, value: totalDonated });
  }

  customField = customFields.find((field) => field.name === ActiveCampaignCustomFields.cashbackDollarsEarnedMonthly);
  if (!!customField) {
    const monthlyCommissionTotal = await getMonthlyCommissionTotal(user);
    fieldValues.push({ id: customField.id, value: monthlyCommissionTotal.toFixed(2) });
  }

  customField = customFields.find((field) => field.name === ActiveCampaignCustomFields.cashbackDollarsAvailable);
  if (!!customField) {
    const availablePayouts = await getAvailableCommissionPayouts(user);
    fieldValues.push({ id: customField.id, value: availablePayouts.toFixed(2) });
  }

  customField = customFields.find((field) => field.name === ActiveCampaignCustomFields.hasLinkedPaypal);
  if (!!customField && !!user.integrations?.paypal) {
    fieldValues.push({ id: customField.id, value: 'true' });
  } else {
    fieldValues.push({ id: customField.id, value: 'false' });
  }

  return fieldValues;
};

export const prepareWeeklyUpdatedFields = async (
  user: IUserDocument,
  customFields: FieldIds,
  fieldValues: FieldValues,
): Promise<FieldValues> => {
  if (!customFields) {
    console.log('No custom fields provided');
    return fieldValues;
  }
  if (!fieldValues) {
    fieldValues = [];
  }

  fieldValues = await setLinkedCardData(user._id, customFields, fieldValues);

  let customField = customFields.find((field) => field.name === ActiveCampaignCustomFields.loginCountLastMonth);
  if (customField) {
    const monthlyLoginCount = await getMonthlyLoginCount(user);
    fieldValues.push({ id: customField.id, value: monthlyLoginCount.toString() });
  }

  customField = customFields.find((field) => field.name === ActiveCampaignCustomFields.loginCountLastWeek);
  if (customField) {
    const weeklyLoginCount = await getWeeklyLoginCount(user);
    fieldValues.push({ id: customField.id, value: weeklyLoginCount.toString() });
  }

  const latestLogin = await UserLogModel.findOne({ userId: user._id }).sort({ date: -1 });
  customField = customFields.find((field) => field.name === ActiveCampaignCustomFields.lastLogin);
  if (customField && latestLogin) {
    fieldValues.push({ id: customField.id, value: latestLogin.date.toISOString() });
  }

  return fieldValues;
};

export const prepareDailyUpdatedFields = async (
  user: IUserDocument,
  customFields: FieldIds,
  fieldValues: FieldValues,
): Promise<FieldValues> => {
  if (!customFields) {
    console.log('No custom fields provided');
    return fieldValues;
  }
  if (!fieldValues) {
    fieldValues = [];
  }
  const customField = customFields.find((field) => field.name === ActiveCampaignCustomFields.loginCountTotal);
  if (!!customField) {
    const totalLoginCount = await getTotalLoginCount(user);
    fieldValues.push({ id: customField.id, value: totalLoginCount.toString() });
  }
  return fieldValues;
};

export const prepareInitialSyncFields = async (
  user: IUserDocument,
  customFields: FieldIds,
  fieldValues: FieldValues,
): Promise<FieldValues> => {
  if (!customFields) {
    console.log('No custom fields provided');
    return fieldValues;
  }
  if (!fieldValues) {
    fieldValues = [];
  }

  let customField = customFields.find((field) => field.name === ActiveCampaignCustomFields.userId);
  if (!!customField) {
    fieldValues.push({ id: customField.id, value: user._id.toString() });
  }

  customField = customFields.find((field) => field.name === ActiveCampaignCustomFields.dateJoined);
  if (!!customField && !!user.dateJoined) {
    fieldValues.push({ id: customField.id, value: user.dateJoined.toISOString() });
  }

  return fieldValues;
};

// Usually event-driven, but this fills the correct value for the initial sync
const setBackfillCashBackEligiblePurchase = async (
  user: IUserDocument,
  customFields: FieldIds,
  fieldValues: FieldValues,
): Promise<FieldValues> => {
  if (!customFields) {
    console.log('No custom fields provided');
    return fieldValues;
  }
  if (!fieldValues) {
    fieldValues = [];
  }

  try {
    const userCommissions = await CommissionModel.find({ user: user._id });
    const customField = customFields.find(
      (field) => field.name === ActiveCampaignCustomFields.madeCashbackEligiblePurchase,
    );
    if (!!userCommissions && userCommissions.length >= 1 && !!customField) {
      fieldValues.push({ id: customField.id, value: 'true' });
    }
  } catch (err) {
    console.error('error getting commission data', err);
  }
  return fieldValues;
};

export const updateMadeCashBackEligiblePurchaseStatus = async (user: IUserDocument, client?: AxiosInstance) => {
  try {
    const ac = new ActiveCampaignClient();
    ac.withHttpClient(client);
    const customFields = await ac.getCustomFieldIDs();

    const fields = [];
    const customField = customFields.find(
      (field) => field.name === ActiveCampaignCustomFields.madeCashbackEligiblePurchase,
    );
    if (customField) {
      fields.push({ id: customField.id, value: 'true' });
    }
    const contacts = [
      {
        email: user.emails.find((e) => e.primary).email,
        fields,
      },
    ];
    await ac.importContacts({ contacts });
  } catch (err) {
    console.error('error updating cashback eligible purchase status', err);
  }
};

// TODO: clean up duplicate code. This is here to avoid a circular dependency
// with the Group service. We could make a 'usergroup' service that this and
// the group service would use
export const getUserGroups = async (userId: string): Promise<Array<string>> => {
  const userGroups = await UserGroupModel.find({
    user: userId,
    status: { $nin: [UserGroupStatus.Removed, UserGroupStatus.Banned, UserGroupStatus.Left] },
  }).populate([
    {
      path: 'group',
      model: GroupModel,
      populate: [
        {
          path: 'company',
          model: CompanyModel,
        },
        {
          path: 'owner',
          model: UserModel,
        },
      ],
    },
  ]);
  let groupNames: string[];
  if (userGroups) {
    groupNames = userGroups
      .map((g) => getShareableUserGroupFromUserGroupDocument(g))
      .map((g) => (g.group as IGroupDocument)?.name);
  }
  return groupNames;
};

export const getActiveCampaignTags = async (userId: string): Promise<string[]> => {
  try {
    if (!userId) return [];
    // get all group names this user is a part of
    const groupNames = await getUserGroups(userId);
    if (groupNames?.length === 0) {
      groupNames.push('');
    }
    return groupNames;
  } catch (err) {
    console.error('error getting group names', err);
    return [];
  }
};

const getSubscriptionLists = async (
  subscribe: ActiveCampaignListId[],
  unsubscribe: ActiveCampaignListId[],
): Promise<ISubscriptionLists> => {
  subscribe = !!subscribe ? subscribe : [];
  unsubscribe = !!unsubscribe ? unsubscribe : [];
  const subscribeList = subscribe.map((listId) => ({
    listid: listId,
  }));
  const unsubscribeList = unsubscribe.map((listId) => ({
    listid: listId,
  }));
  return { subscribe: subscribeList, unsubscribe: unsubscribeList };
};

/* Usage of this funcion is deprecated in favor of the more general: updateActiveCampaignData() */
export const updateActiveCampaignGroupListsAndTags = async (
  user: IUserDocument,
  subscriptions: {
    userId: string;
    subscribe: SubscriptionCode[];
    unsubscribe: SubscriptionCode[];
  },
  client?: AxiosInstance,
): Promise<{
  userId: string;
  lists: { subscribe: SubscriptionCode[]; unsubscribe: SubscriptionCode[] };
}> => {
  try {
    const ac = new ActiveCampaignClient();
    ac.withHttpClient(client);
    if (!subscriptions) {
      return;
    }

    const { subscribe: subscribeCodes, unsubscribe: unsubscribeCodes } = subscriptions;
    const { subscribe, unsubscribe } = await getSubscriptionLists(
      subscribeCodes.map((code: SubscriptionCode) => SubscriptionCodeToProviderProductId[code] as ActiveCampaignListId),
      unsubscribeCodes.map(
        (code: SubscriptionCode) => SubscriptionCodeToProviderProductId[code] as ActiveCampaignListId,
      ),
    );

    const contacts = [
      {
        email: user.emails?.find((e) => e.primary).email,
        subscribe,
        unsubscribe,
        tags: (await getActiveCampaignTags(!!subscriptions.userId ? subscriptions.userId : '')) || [],
      },
    ];

    await ac.importContacts({ contacts });
  } catch (err) {
    console.error('error updating active campaign', err);
  }
};

export type UpdateActiveCampaignDataRequest = {
  userId: Types.ObjectId;
  email: string;
  firstName?: string;
  lastName?: string;
  subscriptions?: {
    subscribe: SubscriptionCode[];
    unsubscribe: SubscriptionCode[];
  };
  tags?: {
    add: string[];
    remove: string[];
  };
  customFields?: FieldValues;
};

export const updateActiveCampaignData = async (
  req: UpdateActiveCampaignDataRequest,
  client?: AxiosInstance,
): Promise<{
  userId: string;
  lists: { subscribe: SubscriptionCode[]; unsubscribe: SubscriptionCode[] };
}> => {
  try {
    const ac = new ActiveCampaignClient();
    ac.withHttpClient(client);

    const { subscribe: subscribeCodes, unsubscribe: unsubscribeCodes } = req.subscriptions;
    const { subscribe, unsubscribe } = await getSubscriptionLists(
      subscribeCodes?.map(
        (code: SubscriptionCode) => SubscriptionCodeToProviderProductId[code] as ActiveCampaignListId,
      ) || [],
      unsubscribeCodes?.map(
        (code: SubscriptionCode) => SubscriptionCodeToProviderProductId[code] as ActiveCampaignListId,
      ) || [],
    );

    /* TODO: handle removing tags - this doesn't seem possible through the same active campaign
     * import endpoint right now. Might need to make a DELETE HTTP request to https://youraccountname.api-us1.com/api/3/contactTags/{id} */

    const contacts = [
      {
        email: req.email,
        first_name: req.firstName,
        last_name: req.lastName,
        subscribe: subscribe.length > 0 ? subscribe : undefined,
        unsubscribe: unsubscribe.length > 0 ? unsubscribe : undefined,
        tags: req.tags?.add?.length > 0 ? req.tags.add : undefined,
        fields: req.customFields?.length > 0 ? req.customFields : undefined,
      },
    ];

    await ac.importContacts({ contacts });

    return {
      userId: req.userId.toString(),
      lists: {
        subscribe: subscribeCodes,
        unsubscribe: unsubscribeCodes,
      },
    };
  } catch (err) {
    console.error('error updating active campaign', err);
  }
};

export const prepareBackfillSyncFields = async (
  user: IUserDocument,
  customFields: FieldIds,
  fieldValues: FieldValues,
): Promise<FieldValues> => {
  fieldValues = fieldValues || [];
  fieldValues = await prepareDailyUpdatedFields(user, customFields, fieldValues);
  fieldValues = await prepareWeeklyUpdatedFields(user, customFields, fieldValues);
  fieldValues = await prepareMonthlyUpdatedFields(user, customFields, fieldValues);
  fieldValues = await prepareQuarterlyUpdatedFields(user, customFields, fieldValues);
  fieldValues = await prepareYearlyUpdatedFields(user, customFields, fieldValues);

  // items that are usually event-driven
  fieldValues = await setBackfillCashBackEligiblePurchase(user, customFields, fieldValues);

  return fieldValues;
};

/* optionally takes and appends to already inserted fieldValues */
export const getCustomFieldIDsAndUpdateSetFields = async (
  userId: string,
  setFields: CustomFieldSetter,
  client?: AxiosInstance,
) => {
  try {
    const ac = new ActiveCampaignClient();
    ac.withHttpClient(client);
    const user = await UserModel.findById(userId);
    if (!user) {
      return;
    }
    const customFields = await ac.getCustomFieldIDs();
    const fields = await setFields(userId, customFields, []);

    const contacts = [
      {
        email: user.emails.find((e) => e.primary).email,
        fields,
      },
    ];

    return await ac.importContacts({ contacts });
  } catch (err) {
    console.error('error updating linked card data');
  }
};

export const updateActiveCampaignListStatus = async (
  email: string,
  subscribe: ActiveCampaignListId[],
  unsubscribe: ActiveCampaignListId[],
  client?: AxiosInstance,
) => {
  const ac = new ActiveCampaignClient();
  ac.withHttpClient(client);

  const subscriptionLists = await getSubscriptionLists(subscribe, unsubscribe);
  const { subscribe: sub, unsubscribe: unsub } = subscriptionLists;

  const contacts = [
    {
      email,
      subscribe: sub,
      unsubscribe: unsub,
    },
  ];

  await ac.importContacts({ contacts });
};

export const deleteContact = async (email: string, client?: AxiosInstance) => {
  try {
    const ac = new ActiveCampaignClient();
    ac.withHttpClient(client);

    // get active campaign id for user
    const rs = await ac.getContacts({ email });
    if (rs?.contacts?.length > 0) {
      return await ac.deleteContact(parseInt(rs.contacts[0].id, 10));
    }
  } catch (err) {
    console.error('Error deleting contact', err);
  }
};

export const removeDuplicateAutomations = (automations: IContactAutomation[]): IContactAutomation[] => automations?.filter((a) => {
  // get all autmations with this id
  const dupeAutomations = automations?.filter((a2) => a2.automation === a.automation);
  if (dupeAutomations.length === 1) {
    // this isn't a dupe, so don't include in resulting set
    return false;
  }
  // is this the most recent automation?
  const oldestDupe = dupeAutomations.reduce((oldest, current) => {
    if (dayjs(current.adddate).isBefore(dayjs(oldest.adddate))) {
      return current;
    }
    return oldest;
  }, dupeAutomations[0]);
  if (oldestDupe.id === a.id) {
    // this is the oldest automation, so keep it
    return false;
  }
  return true;
}) || [];

export const removeDuplicateContactAutomaitons = async (
  email: string,
  client?: AxiosInstance,
): Promise<void> => {
  try {
    const ac = new ActiveCampaignClient();
    ac.withHttpClient(client);

    console.log('Fetching Contact Data for ', email);
    const contactData = await ac.getContacts({ email });
    if (!contactData || !contactData.contacts || contactData.contacts.length <= 0) {
      return null;
    }

    const { id } = contactData.contacts[0];
    const contact = await ac.getContact(parseInt(id));
    if (!contact || !contact.contactAutomations || contact.contactAutomations.length < 1) {
      return null;
    }

    const dupeAutomations = removeDuplicateAutomations(contact.contactAutomations);
    if (dupeAutomations.length < 1) {
      console.log('Found ', 0, ' duplicate automation enrollments for ', email);
      return;
    }
    console.log('Found ', dupeAutomations.length, ' duplicate automation enrollments for ', email);

    const idsToRemove = dupeAutomations.map((a) => parseInt(a.id, 10));

    await Promise.all(idsToRemove.map(async (automationId) => {
      await ac.removeContactAutomation(automationId);
    }));
    console.log('done removing duplicate automations for ', email);
  } catch (err) {
    console.error('Error removing duplicate automation enrollments', err);
  }
};

export const getActiveCampaignContactByEmail = async (
  email: string,
  client?: AxiosInstance,
): Promise<IGetContactResponse | null> => {
  try {
    const ac = new ActiveCampaignClient();
    ac.withHttpClient(client);
    const contactData = await ac.getContacts({ email });
    if (!contactData || !contactData.contacts || contactData.contacts.length <= 0) {
      return null;
    }

    const { id } = contactData.contacts[0];
    const contact = await ac.getContact(parseInt(id));
    if (!contact) {
      return null;
    }

    return contact;
  } catch (err) {
    console.error('Error getting subscribed lists', err);
    return null;
  }
};

export const contactListToSubscribedListIDs = (lists: IContactList[]): ActiveCampaignListId[] => lists
  .filter((list) => {
    if (!Object.values(ActiveCampaignListId).includes(list.list as ActiveCampaignListId)) {
      console.error('Unknown Active Campaign list: ', list.list);
      return false;
    }
    return list.status === '1'; // return only active subscriptions
  })
  .map((list) => list.list as ActiveCampaignListId);

export const getSubscribedLists = async (email: string, client?: AxiosInstance): Promise<ActiveCampaignListId[]> => {
  try {
    const ac = new ActiveCampaignClient();
    ac.withHttpClient(client);
    const contactData = await ac.getContacts({ email });
    if (!contactData || !contactData.contacts || contactData.contacts.length <= 0) {
      throw new Error('No contact found');
    }

    const { id } = contactData.contacts[0];
    const contact = await ac.getContact(parseInt(id));
    if (!contact || !contact.contactLists || contact.contactLists.length <= 0) {
      // not subscribed to any lists
      return [];
    }

    return contactListToSubscribedListIDs(contact.contactLists);
  } catch (err) {
    console.error('Error getting subscribed lists', err);
    return [];
  }
};
