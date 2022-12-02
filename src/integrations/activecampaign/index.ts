import dayjs from 'dayjs';
import { Schema, FilterQuery } from 'mongoose';
import { ActiveCampaignClient } from '../../clients/activeCampaign';
import { sectorsToExcludeFromTransactions } from '../../lib/constants/transaction';
import { getUtcDate } from '../../lib/date';
import { CardModel } from '../../models/card';
import { CommissionPayoutModel, KarmaCommissionPayoutStatus } from '../../models/commissionPayout';
import { CommissionModel, KarmaCommissionStatus } from '../../models/commissions';
import { CompanyModel } from '../../models/company';
import { IShareableGroup, IGroup, IGroupDocument, GroupModel } from '../../models/group';
import { SectorModel } from '../../models/sector';
import { ITransactionDocument, TransactionModel } from '../../models/transaction';
import { IUserDocument, UserModel } from '../../models/user';
import { IUserGroupDocument, IShareableUserGroup, UserGroupModel } from '../../models/userGroup';
import { UserImpactYearData } from '../../models/userImpactTotals';
import { UserLogModel } from '../../models/userLog';
import { UserMontlyImpactReportModel } from '../../models/userMonthlyImpactReport';
import { getUserImpactRatings, getYearlyImpactBreakdown } from '../../services/impact/utils';
import { UserGroupStatus } from '../../types/groups';
import { IRef } from '../../types/model';
import { ActiveCampaignListId } from '../../types/subscription';

export type FieldIds = Array<{ name: string; id: number }>
export type FieldValues = Array<{ id: number; value: string }>

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
    });
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
    }).sort({ date: -1 });
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
    });
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
      ] });

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
    });
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
    });
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
    });
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
    });
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
    fieldValues.push({ id: customField.id, value: yearlyCommissionTotal.toString() });
  }

  customField = customFields.find((field) => field.name === 'carbonEmissionsYearly');
  if (!!customField) {
    const yearlyEmissionsTotal = await getYearlyEmissionsTotal(user);
    fieldValues.push({ id: customField.id, value: yearlyEmissionsTotal.toString() });
  }

  customField = customFields.find((field) => field.name === 'karmaScoreYearly');
  if (!!customField) {
    const yearlyKarmaScore = await getYearlyKarmaScore(user);
    fieldValues.push({ id: customField.id, value: yearlyKarmaScore.toString() });
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
    fieldValues.push({ id: customField.id, value: impactReport.impact.score.toString() });
  }
  customField = customFields.find((field) => field.name === 'impactneutral');
  if (!!customField && !!impactReport?.impact?.neutral) {
    fieldValues.push({ id: customField.id, value: impactReport.impact.neutral.toString() });
  }

  customField = customFields.find((field) => field.name === 'impactpositive');
  if (!!customField && !!impactReport?.impact?.positive) {
    fieldValues.push({ id: customField.id, value: impactReport.impact.positive.toString() });
  }
  customField = customFields.find((field) => field.name === 'impactnegative');
  if (!!customField && !!impactReport?.impact?.negative) {
    fieldValues.push({ id: customField.id, value: impactReport.impact.negative.toString() });
  }
  customField = customFields.find((field) => field.name === 'carbonEmissionsMonthly');
  if (!!customField && !!impactReport?.carbon?.monthlyEmissions) {
    fieldValues.push({ id: customField.id, value: impactReport.carbon.monthlyEmissions.toString() });
  }

  customField = customFields.find((field) => field.name === 'carbonOffsetTonnes');
  if (!!customField && !!impactReport?.carbon?.offsets?.totalOffset) {
    fieldValues.push({ id: customField.id, value: impactReport.carbon.offsets.totalOffset.toString() });
  }

  customField = customFields.find((field) => field.name === 'carbonOffsetDollars');
  if (!!customField && !!impactReport?.carbon?.offsets?.totalDonated) {
    fieldValues.push({ id: customField.id, value: impactReport.carbon.offsets.totalDonated.toString() });
  }

  customField = customFields.find((field) => field.name === 'cashbackDollarsEarnedMonthly');
  if (!!customField) {
    const monthlyCommissionTotal = await getMonthlyCommissionTotal(user);
    fieldValues.push({ id: customField.id, value: monthlyCommissionTotal.toString() });
  }

  customField = customFields.find((field) => field.name === 'cashbackDollarsAvailable');
  if (!!customField) {
    const monthlyPayouts = await getMonthlyPaidCommissionPayouts(user);
    fieldValues.push({ id: customField.id, value: monthlyPayouts.toString() });
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
    }).sort({ createdOn: 1 });

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

  fieldValues.concat(await setLinkedCardData(user._id, customFields, fieldValues));

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

  customField = customFields.find((field) => field.name === 'madeCashbackEligiblePurchase');
  if (!!customField) {
    // set to false initially
    fieldValues.push({ id: customField.id, value: 'false' });
  }

  customField = customFields.find((field) => field.name === 'hasLinkedPaypal');
  if (!!customField) {
    // set to false initially
    fieldValues.push({ id: customField.id, value: 'false' });
  }

  customField = customFields.find((field) => field.name === 'hasLinkedCard');
  if (!!customField) {
    // set to false initially
    fieldValues.push({ id: customField.id, value: 'false' });
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
export const getUserGroups = async (user: IUserDocument): Promise<Array<string>> => {
  const userGroups = await UserGroupModel.find({
    user: user._id,
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

export const updateActiveCampaignTags = async (user: IUserDocument) => {
  try {
    const ac = new ActiveCampaignClient();
    // get all group names this user is a part of
    const groupNames = await getUserGroups(user);

    // add group as a tag in active campaign
    const contacts = [{
      email: user.emails?.find(e => e.primary).email,
      tags: groupNames,
    }];
    await ac.importContacts({ contacts });
  } catch (err) {
    console.error('error updating active campaign tags', err);
  }
};

export const prepareBackfillSyncFields = async (
  user: IUserDocument,
  customFields: FieldIds,
): Promise<FieldValues> => {
  let fieldValues = await prepareInitialSyncFields(user, customFields, []);
  fieldValues = await prepareDailyUpdatedFields(user, customFields, fieldValues);
  fieldValues = await prepareWeeklyUpdatedFields(user, customFields, fieldValues);
  fieldValues = await prepareMonthlyUpdatedFields(user, customFields, fieldValues);
  fieldValues = await prepareQuarterlyUpdatedFields(user, customFields, fieldValues);
  fieldValues = await prepareYearlyUpdatedFields(user, customFields, fieldValues);

  // items that are usually event-driven
  fieldValues = await setBackfillCashBackEligiblePurchase(user, customFields, fieldValues);
  fieldValues = await setLinkedCardData(user._id, customFields, fieldValues);

  return fieldValues;
};

export const getBackfillSubscribeList = async (dateJoined: Date): Promise<ActiveCampaignListId[]> => {
  const backfillSubscriberList = [ActiveCampaignListId.GeneralUpdates];
  // add them to AccountUpdates list if registered within the last 45 days
  if (dateJoined && dateJoined > getUtcDate().subtract(45, 'days').toDate()) {
    backfillSubscriberList.push(ActiveCampaignListId.AccountUpdates);
  }
  return backfillSubscriberList;
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

  subscribe = subscribe || [];
  unsubscribe = unsubscribe || [];
  const subscribeList = subscribe.map((listId) => ({
    listid: listId,
  }));
  const unsubscribeList = unsubscribe.map((listId) => ({
    listid: listId,
  }));

  const contacts = [{
    email,
    subscribe: subscribeList,
    unsubscribe: unsubscribeList,
  }];

  await ac.importContacts({ contacts });
};
