import dayjs from 'dayjs';
import { FilterQuery, Schema } from 'mongoose';
import { ActiveCampaignClient, IContactsData, IContactsImportData } from '../../clients/activeCampaign';
import { UserGroupRole } from '../../lib/constants';
import { ProviderProductIdToSubscriptionCode } from '../../lib/constants/subscription';
import { sectorsToExcludeFromTransactions } from '../../lib/constants/transaction';
import { CardModel } from '../../models/card';
import { CommissionPayoutModel, KarmaCommissionPayoutStatus } from '../../models/commissionPayout';
import { CommissionModel, KarmaCommissionStatus } from '../../models/commissions';
import { CompanyModel } from '../../models/company';
import { GroupModel, IGroup, IGroupDocument, IShareableGroup } from '../../models/group';
import { SectorModel } from '../../models/sector';
import { ITransactionDocument, TransactionModel } from '../../models/transaction';
import { IUserDocument, UserModel } from '../../models/user';
import { IShareableUserGroup, IUserGroupDocument, UserGroupModel } from '../../models/userGroup';
import { UserImpactYearData } from '../../models/userImpactTotals';
import { UserLogModel } from '../../models/userLog';
import { UserMontlyImpactReportModel } from '../../models/userMonthlyImpactReport';
import { getUserImpactRatings, getYearlyImpactBreakdown } from '../../services/impact/utils';
import { UserGroupStatus } from '../../types/groups';
import { IRef } from '../../types/model';
import { ActiveCampaignListId, SubscriptionCode } from '../../types/subscription';

export type FieldIds = Array<{ name: string; id: number }>
export type FieldValues = Array<{ id: number; value: string }>

interface SubscriptionLists{
  subscribe: Array<{listid: ActiveCampaignListId}>;
  unsubscribe: Array<{listid: ActiveCampaignListId}>;
}
// duplicated code to avoid circular dependency
const getShareableUserGroupFromUserGroupDocument = ({
  _id,
  group,
  email,
  role,
  status,
  joinedOn,
}: IUserGroupDocument): (IShareableUserGroup & { _id: string }) => {
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
    } as (IShareableGroup & { _id: string });
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

const groupTransactionsByYear = (transactions: ITransactionDocument[]) => {
  const yearlyBreakdown: { [key: string]: ITransactionDocument[] } = {};

  for (const transaction of transactions) {
    const date = dayjs(transaction.date).utc();
    if (!yearlyBreakdown.hasOwnProperty(date.format('YYYY'))) {
      yearlyBreakdown[date.format('YYYY')] = [];
    }

    yearlyBreakdown[date.format('YYYY')].push(transaction);
  }

  return yearlyBreakdown;
};

const getYearlyKarmaScore = async (user: IUserDocument): Promise<number> => {
  const query: FilterQuery<ITransactionDocument> = {
    $and: [
      { user },
      { company: { $ne: null } },
      { sector: { $nin: sectorsToExcludeFromTransactions } },
      { amount: { $gt: 0 } },
      { reversed: { $ne: true } },
      { date: { $gte: dayjs().subtract(1, 'year').utc().toDate() } },
      { date: { $lte: dayjs().utc().endOf('year').toDate() } },
    ],
  };

  let transactions: ITransactionDocument[];
  let ratings: [number, number][];
  let yearlyBreakdown: { [key: string]: ITransactionDocument[] };
  let yearlyImpactBreakdown: UserImpactYearData[];

  try {
    transactions = await TransactionModel
      .find(query)
      .populate([
        {
          path: 'company',
          model: CompanyModel,
          populate: {
            path: 'sectors.sector',
            model: SectorModel,
          },
        },
      ])
      .sort({ date: -1 });
    ratings = await getUserImpactRatings();
    yearlyBreakdown = groupTransactionsByYear(transactions);
    yearlyImpactBreakdown = getYearlyImpactBreakdown(transactions, ratings);
  } catch (err) {
    console.error(err);
    return 0;
  }

  if (!yearlyBreakdown.length) {
    return 0;
  }

  const impactData = yearlyImpactBreakdown.find(data => dayjs(data.date).utc().format('YYYY') === dayjs(yearlyBreakdown[0][0].date).utc().format('YYYY'));
  return impactData ? impactData.score : 0;
};

// Gets all commissions from the previous year. Not rolling 365 days.
const getYearlyCommissionTotal = async (user: IUserDocument): Promise<number> => {
  try {
    const commissions = await CommissionModel.find({
      $and: [
        { user: user._id },
        { status: { $ne: KarmaCommissionStatus.Canceled } },
        { date: { $gte: dayjs().subtract(1, 'year').utc().toDate() } },
        { date: { $lte: dayjs().utc().endOf('year').toDate() } },
      ],
    }).lean();
    if (!commissions) {
      return 0;
    }
    const commissionSum = commissions.reduce(
      (partialSum, commission) => partialSum + commission.amount,
      0,
    );
    return commissionSum;
  } catch (err) {
    console.error(err);
    return 0;
  }
};

const getMonthlyCommissionTotal = async (user: IUserDocument): Promise<number> => {
  try {
    const commissions = await CommissionModel.find({
      $and: [
        { user: user._id },
        { status: { $ne: KarmaCommissionStatus.Canceled } },
        { date: { $gte: dayjs().subtract(1, 'month').utc().toDate() } },
        { date: { $lte: dayjs().utc().endOf('month').toDate() } },
      ],
    }).lean().sort({ date: -1 });
    if (!commissions) {
      return 0;
    }
    const commissionSum = commissions.reduce(
      (partialSum, commission) => partialSum + commission.amount,
      0,
    );
    return commissionSum;
  } catch (err) {
    console.error(err);
    return 0;
  }
};

const getMonthlyPaidCommissionPayouts = async (user: IUserDocument): Promise<number> => {
  try {
    const commissionPayouts = await CommissionPayoutModel.find({
      $and: [
        { user: user._id },
        { status: KarmaCommissionPayoutStatus.Paid },
        { date: { $gte: dayjs().subtract(1, 'month').utc().toDate() } },
        { date: { $lte: dayjs().utc().endOf('month').toDate() } },
      ],
    }).lean();
    if (!commissionPayouts) {
      return 0;
    }
    const commissionPayoutsSum = commissionPayouts.reduce(
      (partialSum, payout) => partialSum + payout.amount,
      0,
    );
    return commissionPayoutsSum;
  } catch (err) {
    console.error(err);
    return 0;
  }
};

const getYearlyEmissionsTotal = async (user: IUserDocument): Promise<number> => {
  try {
    const impactReports = await UserMontlyImpactReportModel.find({
      $and: [
        { user: user._id },
        { date: { $gte: dayjs().subtract(1, 'year').utc().toDate() } },
        { date: { $lte: dayjs().utc().endOf('year').toDate() } },
      ] }).lean();

    if (!impactReports) {
      return 0;
    }
    const emissionsSum = impactReports.reduce(
      (partialSum, report) => partialSum + report.carbon.monthlyEmissions,
      0,
    );
    return emissionsSum;
  } catch (err) {
    console.error(err);
    return 0;
  }
};

const getWeeklyLoginCount = async (user: IUserDocument): Promise<number> => {
  try {
    const logins = await UserLogModel.find({
      $and: [
        { userId: user._id },
        { date: { $gte: dayjs().subtract(1, 'week').utc().toDate() } },
        { date: { $lte: dayjs().utc().endOf('week').toDate() } },
      ],
    }).lean();
    return logins ? logins.length : 0;
  } catch (err) {
    console.error(err);
    return 0;
  }
};

const getMonthlyLoginCount = async (user: IUserDocument): Promise<number> => {
  try {
    const logins = await UserLogModel.find({
      $and: [
        { userId: user._id },
        { date: { $gte: dayjs().subtract(1, 'month').utc().toDate() } },
        { date: { $lte: dayjs().utc().endOf('month').toDate() } },
      ],
    }).lean();
    return logins ? logins.length : 0;
  } catch (err) {
    console.error(err);
    return 0;
  }
};

const getYearlyLoginCount = async (user: IUserDocument): Promise<number> => {
  try {
    const logins = await UserLogModel.find({
      $and: [
        { userId: user._id },
        { date: { $gte: dayjs().subtract(1, 'year').utc().toDate() } },
        { date: { $lte: dayjs().utc().endOf('year').toDate() } },
      ],
    }).lean();
    return logins ? logins.length : 0;
  } catch (err) {
    console.error(err);
    return 0;
  }
};

// Gets all logins for a given user
// NOTE: Multiple "logins" within a 24 hour period are counted as one login
const getTotalLoginCount = async (user: IUserDocument): Promise<number> => {
  try {
    const logins = await UserLogModel.find({
      $and: [
        { userId: user._id },
        { $exists: { date: true } },
        { $ne: { date: null } },
      ],
    }).lean();
    return logins ? logins.length : 0;
  } catch (err) {
    console.error(err);
    return 0;
  }
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
  let customField = customFields.find((field) => field.name === 'cashbackDollarsEarnedYearly');
  if (!!customField) {
    const yearlyCommissionTotal = await getYearlyCommissionTotal(user);
    fieldValues.push({ id: customField.id, value: yearlyCommissionTotal.toFixed(2) });
  }

  customField = customFields.find((field) => field.name === 'carbonEmissionsYearly');
  if (!!customField) {
    const yearlyEmissionsTotal = await getYearlyEmissionsTotal(user);
    fieldValues.push({ id: customField.id, value: yearlyEmissionsTotal.toFixed(2) });
  }

  customField = customFields.find((field) => field.name === 'karmaScoreYearly');
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
  const impactReport = await UserMontlyImpactReportModel.findOne(
    { user },
  ).sort({ date: -1 });

  let customField = customFields.find((field) => field.name === 'loginCountLastYear');

  if (!!customField) {
    const yearlyLoginCount = await getYearlyLoginCount(user);
    fieldValues.push({ id: customField.id, value: yearlyLoginCount.toString() });
  }
  customField = customFields.find((field) => field.name === 'monthsKarmaScore');
  if (!!customField && !!impactReport?.impact?.score) {
    const score = impactReport.impact.score.toFixed(0);
    fieldValues.push({ id: customField.id, value: score });
  }
  customField = customFields.find((field) => field.name === 'impactneutral');
  if (!!customField && !!impactReport?.impact?.neutral) {
    const neutral = impactReport.impact.neutral.toFixed(0);
    fieldValues.push({ id: customField.id, value: neutral });
  }

  customField = customFields.find((field) => field.name === 'impactpositive');
  if (!!customField && !!impactReport?.impact?.positive) {
    const positive = impactReport.impact.positive.toFixed(0);
    fieldValues.push({ id: customField.id, value: positive });
  }
  customField = customFields.find((field) => field.name === 'impactnegative');
  if (!!customField && !!impactReport?.impact?.negative) {
    const negative = impactReport.impact.negative.toFixed(0);
    fieldValues.push({ id: customField.id, value: negative });
  }
  customField = customFields.find((field) => field.name === 'carbonEmissionsMonthly');
  if (!!customField && !!impactReport?.carbon?.monthlyEmissions) {
    const monthlyEmissions = impactReport.carbon.monthlyEmissions.toFixed(2);
    fieldValues.push({ id: customField.id, value: monthlyEmissions });
  }

  customField = customFields.find((field) => field.name === 'carbonOffsetTonnes');
  if (!!customField && !!impactReport?.carbon?.offsets?.totalOffset) {
    const totalOffset = impactReport.carbon.offsets.totalOffset.toFixed(2);
    fieldValues.push({ id: customField.id, value: totalOffset });
  }

  customField = customFields.find((field) => field.name === 'carbonOffsetDollars');
  if (!!customField && !!impactReport?.carbon?.offsets?.totalDonated) {
    const totalDonated = impactReport.carbon.offsets.totalDonated.toFixed(2);
    fieldValues.push({ id: customField.id, value: totalDonated });
  }

  customField = customFields.find((field) => field.name === 'cashbackDollarsEarnedMonthly');
  if (!!customField) {
    const monthlyCommissionTotal = await getMonthlyCommissionTotal(user);
    fieldValues.push({ id: customField.id, value: monthlyCommissionTotal.toFixed(2) });
  }

  customField = customFields.find((field) => field.name === 'cashbackDollarsAvailable');
  if (!!customField) {
    const monthlyPayouts = await getMonthlyPaidCommissionPayouts(user);
    fieldValues.push({ id: customField.id, value: monthlyPayouts.toFixed(2) });
  }

  customField = customFields.find((field) => field.name === 'hasLinkedPaypal');
  if (!!customField && !!user.integrations?.paypal) {
    fieldValues.push({ id: customField.id, value: 'true' });
  } else {
    fieldValues.push({ id: customField.id, value: 'false' });
  }

  return fieldValues;
};

export const setLinkedCardData = async (userId: string, customFields: FieldIds, fieldValues: FieldValues): Promise<FieldValues> => {
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
      status: 'linked',
    }).lean().sort({ createdOn: 1 });

    let customField = customFields.find((field) => field.name === 'hasLinkedCard');
    if (customField) {
      if (cards.length > 0) {
        fieldValues.push({ id: customField.id, value: 'true' });

        customField = customFields.find((field) => field.name === 'lastLinkedCardDate');
        if (!!customField && cards[cards.length - 1]?.createdOn) {
          fieldValues.push({ id: customField.id, value: cards[cards.length - 1].createdOn.toISOString() });
        }

        customField = customFields.find((field) => field.name === 'firstLinkedCardDate');
        if (!!customField && cards[0]?.createdOn) {
          fieldValues.push({ id: customField.id, value: cards[0].createdOn.toISOString() });
        }
      } else {
        fieldValues.push({ id: customField.id, value: 'false' });
      }
    }

    customField = customFields.find((field) => field.name === 'numLinkedCards');
    if (!!customField) {
      fieldValues.push({ id: customField.id, value: cards.length.toString() });
    }
  } catch (err) {
    console.error('error getting linked card data', err);
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

  let customField = customFields.find((field) => field.name === 'loginCountLastMonth');
  if (customField) {
    const monthlyLoginCount = await getMonthlyLoginCount(user);
    fieldValues.push({ id: customField.id, value: monthlyLoginCount.toString() });
  }

  customField = customFields.find((field) => field.name === 'loginCountLastWeek');
  if (customField) {
    const weeklyLoginCount = await getWeeklyLoginCount(user);
    fieldValues.push({ id: customField.id, value: weeklyLoginCount.toString() });
  }

  const latestLogin = await UserLogModel.findOne({ userId: user._id }).sort({ date: -1 });
  customField = customFields.find((field) => field.name === 'lastLogin');
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
  const customField = customFields.find((field) => field.name === 'loginCountTotal');
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

  let customField = customFields.find((field) => field.name === 'userId');
  if (!!customField) {
    fieldValues.push({ id: customField.id, value: user._id.toString() });
  }

  customField = customFields.find((field) => field.name === 'dateJoined');
  if (!!customField && !!user.dateJoined) {
    fieldValues.push({ id: customField.id, value: user.dateJoined.toISOString() });
  }

  return fieldValues;
};

// Usually event-driven, but this fills the correct value for the initial sync
const setBackfillCashBackEligiblePurchase = async (user: IUserDocument, customFields: FieldIds, fieldValues: FieldValues): Promise<FieldValues> => {
  if (!customFields) {
    console.log('No custom fields provided');
    return fieldValues;
  }
  if (!fieldValues) {
    fieldValues = [];
  }

  try {
    const userCommissions = await CommissionModel.find({ user: user._id });
    const customField = customFields.find((field) => field.name === 'madeCashbackEligiblePurchase');
    if (!!userCommissions && userCommissions.length >= 1 && !!customField) {
      fieldValues.push({ id: customField.id, value: 'true' });
    }
  } catch (err) {
    console.error('error getting commission data', err);
  }
  return fieldValues;
};

export const updateMadeCashBackEligiblePurchaseStatus = async (user: IUserDocument) => {
  try {
    const ac = new ActiveCampaignClient();
    const customFields = await ac.getCustomFieldIDs();

    const fields = [];
    const customField = customFields.find((field) => field.name === 'madeCashbackEligiblePurchase');
    if (customField) {
      fields.push({ id: customField.id, value: 'true' });
    }
    const contacts = [{
      email: user.emails.find(e => e.primary).email,
      fields,
    }];
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
      .map(g => getShareableUserGroupFromUserGroupDocument(g))
      .map(g => (g.group as IGroupDocument)?.name);
  }
  return groupNames;
};

const getActiveCampaignTags = async (userId: string) => {
  try {
    // get all group names this user is a part of
    const groupNames = await getUserGroups(userId);
    if (groupNames?.length === 0) {
      groupNames.push('');
    }
    return groupNames;
  } catch (err) {
    console.error('error getting group names', err);
  }
};

export const getSubscriptionLists = async (subscribe: ActiveCampaignListId[], unsubscribe: ActiveCampaignListId[]): Promise<SubscriptionLists> => {
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

export const updateActiveCampaignGroupSubscriptionsAndTags = async (user: IUserDocument): Promise<{
  userId: string,
  lists: {subscribe: SubscriptionCode[], unsubscribe: SubscriptionCode[]},
}> => {
  try {
    const ac = new ActiveCampaignClient();
    const sub: Array<ActiveCampaignListId> = [];
    const unsub: Array<ActiveCampaignListId> = [];

    const groupNames = await getActiveCampaignTags(user._id.toString());
    if (!!groupNames && groupNames.length > 0) {
      sub.push(ActiveCampaignListId.GroupMembers);
    } else {
      unsub.push(ActiveCampaignListId.GroupMembers);
    }

    const userGroups = await UserGroupModel.find({ $and: [
      { user: user._id },
      { role: { $in: [UserGroupRole.Owner, UserGroupRole.Admin, UserGroupRole.SuperAdmin] } },
    ] }).lean();
    if (!!userGroups && userGroups?.length > 0) {
      sub.push(ActiveCampaignListId.GroupAdmins);
    } else {
      // TODO: push if they have an active subscription to the group admins list
      // This check should be moved out of here. Maybe this function should just
      // get the lists of subs an unsubs that have to be done
    }

    const { subscribe, unsubscribe } = await getSubscriptionLists(sub, unsub);

    const contacts = [{
      email: user.emails?.find(e => e.primary).email,
      subscribe,
      unsubscribe,
      tags: groupNames,
    }];
    await ac.importContacts({ contacts });
    return {
      userId: user._id.toString(),
      lists: {
        subscribe: sub.map((listId) => ProviderProductIdToSubscriptionCode[listId]),
        unsubscribe: unsub.map((listId) => ProviderProductIdToSubscriptionCode[listId]),
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

export const getCustomFieldIDsAndUpdateLinkedCards = async (userId: string) => {
  try {
    const ac = new ActiveCampaignClient();
    const user = await UserModel.findById(userId);
    if (!user) {
      return;
    }
    const customFields = await ac.getCustomFieldIDs();
    const fields = await setLinkedCardData(userId, customFields, []);

    const contacts = [{
      email: user.emails.find(e => e.primary).email,
      fields,
    }];

    await ac.importContacts({ contacts });
  } catch (err) {
    console.error('error updating linked card data');
  }
};

export const updateActiveCampaignListStatus = async (email: string, subscribe: ActiveCampaignListId[], unsubscribe: ActiveCampaignListId[]) => {
  const ac = new ActiveCampaignClient();

  const subscriptionLists = await getSubscriptionLists(subscribe, unsubscribe);
  const { subscribe: sub, unsubscribe: unsub } = subscriptionLists;

  const contacts = [{
    email,
    subscribe: sub,
    unsubscribe: unsub,
  }];

  await ac.importContacts({ contacts });
};

export const deleteContact = async (email: string) => {
  try {
    const ac = new ActiveCampaignClient();
    // get active campaign id for user
    const rs = await ac.getContacts({ email });
    if (rs?.contacts?.length > 0) {
      return await ac.deleteContact(parseInt(rs.contacts[0].id, 10));
    }
  } catch (err) {
    console.error('Error deleting contact', err);
  }
};

export const getSubscribedLists = async (email: string): Promise<ActiveCampaignListId[]> => {
  try {
    const ac = new ActiveCampaignClient();
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

    return contact.contactLists
      .filter((list) => {
        if (!(Object.values(ActiveCampaignListId).includes(list.list as ActiveCampaignListId))) {
          console.error('Unknown Active Campaign list: ', list.list);
          return false;
        }
        return list.status === '1'; // return only active subscriptions
      })
      .map((list) => list.list as ActiveCampaignListId);
  } catch (err) {
    console.error('Error getting subscribed lists', err);
  }
};

interface UserLists {
  userId: string,
  email: string,
  lists: SubscriptionLists
}

export const prepareSubscriptionListsAndTags = async (userLists: UserLists[]): Promise<IContactsImportData> => {
  const contacts = await Promise.all(userLists.map(async (list) => {
    const contact: IContactsData = {
      email: list.email,
      subscribe: list.lists.subscribe,
      unsubscribe: list.lists.unsubscribe,
      tags: await getUserGroups(list.userId),
    };
    return contact;
  }));
  return { contacts };
};
