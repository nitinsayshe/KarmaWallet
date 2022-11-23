import { SandboxedJob } from 'bullmq';
import dayjs from 'dayjs';
import { FilterQuery } from 'mongoose';
import {
  ActiveCampaignClient, IContactsData,
  IContactsImportData,
} from '../clients/activeCampaign';
import * as ActiveCampaignIntegration from '../integrations/activecampaign';
import { ActiveCampaignSyncTypes } from '../lib/constants/activecampaign';
import { JobNames } from '../lib/constants/jobScheduler';
import { sectorsToExcludeFromTransactions } from '../lib/constants/transaction';
import { getUtcDate } from '../lib/date';
import { CommissionPayoutModel, KarmaCommissionPayoutStatus } from '../models/commissionPayout';
import { CommissionModel, KarmaCommissionStatus } from '../models/commissions';
import { CompanyModel } from '../models/company';
import { SectorModel } from '../models/sector';
import { ITransactionDocument, TransactionModel } from '../models/transaction';
import { IUser, IUserDocument, UserModel } from '../models/user';
import { UserImpactYearData } from '../models/userImpactTotals';
import { UserLogModel } from '../models/userLog';
import { UserMontlyImpactReportModel } from '../models/userMonthlyImpactReport';
import { getUserImpactRatings, getYearlyImpactBreakdown, getYearStartDate } from '../services/impact/utils';
import { ActiveCampaignListId } from '../types/subscription';

interface IJobData {
  syncType: ActiveCampaignSyncTypes
}

export const groupTransactionsByYear = (transactions: ITransactionDocument[]) => {
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

// Calculates karma score for the previous year. Not rolling 365 days.
export const getYearlyKarmaScore = async (user: Partial<IUserDocument>): Promise<number> => {
  const lastYearStart = getYearStartDate(dayjs().utc().subtract(1, 'year'));
  const lastYearEnd = lastYearStart.endOf('year');
  const query: FilterQuery<ITransactionDocument> = {
    $and: [
      { user },
      { company: { $ne: null } },
      { sector: { $nin: sectorsToExcludeFromTransactions } },
      { amount: { $gt: 0 } },
      { reversed: { $ne: true } },
      { date: { $gte: lastYearStart.toDate() } },
      { date: { $lte: lastYearEnd.toDate() } },
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
export const getYearlyCommissionTotal = async (user: Partial<IUserDocument>): Promise<number> => {
  try {
    const commissions = await CommissionModel.find({
      $and: [
        { user },
        { status: { $ne: KarmaCommissionStatus.Canceled } },
        {
          $where() {
            const currentDate = new Date();
            const lastYearDate = new Date(
              currentDate.setUTCFullYear(currentDate.getUTCFullYear() - 1),
            );
            return (
              this.date && this.date.getUTCFullYear() === lastYearDate.getUTCFullYear()
            );
          },
        },
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

// Gets all commissions from the previous month. Not rolling 30 days.
export const getMonthlyCommissionTotal = async (user: Partial<IUserDocument>): Promise<number> => {
  // fetches commissions for the previous month
  try {
    const commissions = await CommissionModel.find({
      $and: [
        { user: user._id },
        { status: { $ne: KarmaCommissionStatus.Canceled } },
        {
          $where() {
            const currentDate = new Date();
            const lastMonthDate = new Date(
              currentDate.setUTCMonth(currentDate.getUTCMonth() - 1),
            );
            return (
              this.date && this.date.getUTCFullYear() === lastMonthDate.getUTCFullYear()
            && this.date.getUTCMonth() === lastMonthDate.getUTCMonth()
            );
          },
        },
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

// Gets payouts from the previous month. Not rolling 30 days.
export const getMonthlyPaidCommissionPayouts = async (user: Partial<IUserDocument>): Promise<number> => {
  // fetches commissions for the previous month
  try {
    const commissionPayouts = await CommissionPayoutModel.find({
      $and: [
        { user: user._id },
        { status: KarmaCommissionPayoutStatus.Paid },
        {
          $where() {
            const currentDate = new Date();
            const lastMonthDate = new Date(
              currentDate.setUTCMonth(currentDate.getUTCMonth() - 1),
            );
            return (
              this.date && this.date.getUTCFullYear() === lastMonthDate.getUTCFullYear()
            && this.date.getUTCMonth() === lastMonthDate.getUTCMonth()
            );
          },
        },
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

// Gets emissions from the previous month. Not rolling 365 days.
export const getYearlyEmissionsTotal = async (user: Partial<IUserDocument>): Promise<number> => {
  try {
    const impactReports = await UserMontlyImpactReportModel.find({
      $and: [
        { user },
        {
          $where() {
            const currentDate = new Date();
            const lastYearDate = new Date(
              currentDate.setUTCFullYear(currentDate.getUTCFullYear() - 1),
            );
            return (
              this.date && this.date.getUTCFullYear() === lastYearDate.getUTCFullYear()
            );
          },
        },
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

// Gets logins from the previous week. Not rolling 7 days.
export const getWeeklyLoginCount = async (user: Partial<IUserDocument>): Promise<number> => {
  try {
    const logins = await UserLogModel.find({
      $and: [
        { user },
        {
          $where() {
            const currentDate = new Date();
            const lastWeekDate = new Date(
              currentDate.setUTCDate(currentDate.getUTCDate() - 7),
            );
            return (
              this.date && this.date.getUTCFullYear() === lastWeekDate.getUTCFullYear()
            && this.date.getUTCMonth() === lastWeekDate.getUTCMonth()
            );
          },
        },
      ],
    });
    return logins ? logins.length : 0;
  } catch (err) {
    console.error(err);
    return 0;
  }
};

// Gets logins from the previous month. Not rolling 30 days.
export const getMonthlyLoginCount = async (user: Partial<IUserDocument>): Promise<number> => {
  try {
    const logins = await UserLogModel.find({
      $and: [
        { user },
        {
          $where() {
            const currentDate = new Date();
            const lastMonthDate = new Date(
              currentDate.setUTCMonth(currentDate.getUTCMonth() - 1),
            );
            return (
              this.date && this.date.getUTCFullYear() === lastMonthDate.getUTCFullYear()
            && this.date.getUTCMonth() === lastMonthDate.getUTCMonth()
            );
          },
        },
      ],
    });
    return logins ? logins.length : 0;
  } catch (err) {
    console.error(err);
    return 0;
  }
};

// Gets logins from the previous year. Not rolling 365 days.
export const getYearlyLoginCount = async (user: Partial<IUserDocument>): Promise<number> => {
  try {
    const logins = await UserLogModel.find({
      $and: [
        { user },
        {
          $where() {
            const currentDate = new Date();
            const lastYearDate = new Date(
              currentDate.setUTCFullYear(currentDate.getUTCFullYear() - 1),
            );
            return (
              this.date && this.date && this.date.getUTCFullYear() === lastYearDate.getUTCFullYear()
            );
          },
        },
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
export const getTotalLoginCount = async (user: Partial<IUserDocument>): Promise<number> => {
  try {
    const logins = await UserLogModel.find({
      $and: [
        { user },
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

const prepareYearlyUpdatedFields = async (
  user: Partial<IUserDocument>,
  customFields: ActiveCampaignIntegration.FieldIds,
  fieldValues: ActiveCampaignIntegration.FieldValues,
): Promise<ActiveCampaignIntegration.FieldValues> => {
  if (!customFields) {
    console.log('No custom fields provided');
    return fieldValues;
  }
  if (!fieldValues) {
    fieldValues = [];
  }
  let customField = customFields.find((field) => field.name === 'cashbackDollarsEarnedYearly');
  if (customField) {
    const yearlyCommissionTotal = await getYearlyCommissionTotal(user);
    fieldValues.push({ id: customField.id, value: yearlyCommissionTotal.toString() });
  }

  customField = customFields.find((field) => field.name === 'carbonEmissionsYearly');
  if (customField) {
    const yearlyEmissionsTotal = await getYearlyEmissionsTotal(user);
    fieldValues.push({ id: customField.id, value: yearlyEmissionsTotal.toString() });
  }

  customField = customFields.find((field) => field.name === 'karmaScoreYearly');
  if (customField) {
    const yearlyKarmaScore = await getYearlyKarmaScore(user);
    fieldValues.push({ id: customField.id, value: yearlyKarmaScore.toString() });
  }
  return fieldValues;
};

const prepareQuarterlyUpdatedFields = async (
  user: Partial<IUserDocument>,
  customFields: ActiveCampaignIntegration.FieldIds,
  fieldValues: ActiveCampaignIntegration.FieldValues,
): Promise<ActiveCampaignIntegration.FieldValues> => {
  if (!customFields) {
    console.log('No custom fields provided');
    return fieldValues;
  }
  if (!fieldValues) {
    fieldValues = [];
  }
  return fieldValues;
};

const prepareMonthlyUpdatedFields = async (
  user: Partial<IUserDocument>,
  customFields: ActiveCampaignIntegration.FieldIds,
  fieldValues: ActiveCampaignIntegration.FieldValues,
): Promise<ActiveCampaignIntegration.FieldValues> => {
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
  if (customField) {
    const yearlyLoginCount = await getYearlyLoginCount(user);
    fieldValues.push({ id: customField.id, value: yearlyLoginCount.toString() });
  }

  customField = customFields.find((field) => field.name === 'monthsKarmaScore');
  if (customField) {
    fieldValues.push({ id: customField.id, value: impactReport.impact.score.toString() });
  }
  customField = customFields.find((field) => field.name === 'impactneutral');
  if (customField) {
    fieldValues.push({ id: customField.id, value: impactReport.impact.neutral.toString() });
  }

  customField = customFields.find((field) => field.name === 'impactpositive');
  if (customField) {
    fieldValues.push({ id: customField.id, value: impactReport.impact.positive.toString() });
  }

  customField = customFields.find((field) => field.name === 'impactnegative');
  if (customField) {
    fieldValues.push({ id: customField.id, value: impactReport.impact.negative.toString() });
  }

  customField = customFields.find((field) => field.name === 'carbonEmissionsMonthly');
  if (customField) {
    fieldValues.push({ id: customField.id, value: impactReport.carbon.monthlyEmissions.toString() });
  }

  customField = customFields.find((field) => field.name === 'carbonOffsetTonnes');
  if (customField) {
    fieldValues.push({ id: customField.id, value: impactReport.carbon.offsets.totalOffset.toString() });
  }

  customField = customFields.find((field) => field.name === 'carbonOffsetDollars');
  if (customField) {
    fieldValues.push({ id: customField.id, value: impactReport.carbon.offsets.totalDonated.toString() });
  }

  customField = customFields.find((field) => field.name === 'cashbackDollarsEarnedMonthly');
  if (customField) {
    const monthlyCommissionTotal = await getMonthlyCommissionTotal(user);
    fieldValues.push({ id: customField.id, value: monthlyCommissionTotal.toString() });
  }

  customField = customFields.find((field) => field.name === 'cashbackDollarsAvailable');
  if (customField) {
    const monthlyPayouts = await getMonthlyPaidCommissionPayouts(user);
    fieldValues.push({ id: customField.id, value: monthlyPayouts.toString() });
  }

  customField = customFields.find((field) => field.name === 'hasLinkedPaypal');
  if (customField) {
    if (user.integrations?.paypal) {
      fieldValues.push({ id: customField.id, value: 'true' });
    } else {
      fieldValues.push({ id: customField.id, value: 'false' });
    }
  }

  return fieldValues;
};

const prepareWeeklyUpdatedFields = async (
  user: Partial<IUserDocument>,
  customFields: ActiveCampaignIntegration.FieldIds,
  fieldValues: ActiveCampaignIntegration.FieldValues,
): Promise<ActiveCampaignIntegration.FieldValues> => {
  if (!customFields) {
    console.log('No custom fields provided');
    return fieldValues;
  }
  if (!fieldValues) {
    fieldValues = [];
  }

  fieldValues.concat(await ActiveCampaignIntegration.setLinkedCardData(user._id, customFields, fieldValues));

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

  const latestLogin = await UserLogModel.findOne({ user }).sort({ date: -1 });
  customField = customFields.find((field) => field.name === 'lastLogin');
  if (customField && latestLogin) {
    fieldValues.push({ id: customField.id, value: latestLogin.date.toISOString() });
  }

  return fieldValues;
};

const prepareDailyUpdatedFields = async (
  user: Partial<IUserDocument>,
  customFields: ActiveCampaignIntegration.FieldIds,
  fieldValues: ActiveCampaignIntegration.FieldValues,
): Promise<ActiveCampaignIntegration.FieldValues> => {
  if (!customFields) {
    console.log('No custom fields provided');
    return fieldValues;
  }
  if (!fieldValues) {
    fieldValues = [];
  }
  const customField = customFields.find((field) => field.name === 'loginCountTotal');
  if (customField) {
    const totalLoginCount = await getTotalLoginCount(user);
    fieldValues.push({ id: customField.id, value: totalLoginCount.toString() });
  }
  return fieldValues;
};

const prepareInitialSyncFields = async (
  user: Partial<IUserDocument>,
  customFields: ActiveCampaignIntegration.FieldIds,
  fieldValues: ActiveCampaignIntegration.FieldValues,
): Promise<ActiveCampaignIntegration.FieldValues> => {
  if (!customFields) {
    console.log('No custom fields provided');
    return fieldValues;
  }
  if (!fieldValues) {
    fieldValues = [];
  }

  let customField = customFields.find((field) => field.name === 'userId');
  if (customField) {
    fieldValues.push({ id: customField.id, value: user._id.toString() });
  }

  customField = customFields.find((field) => field.name === 'dateJoined');
  if (customField) {
    fieldValues.push({ id: customField.id, value: user.dateJoined.toISOString() });
  }

  customField = customFields.find((field) => field.name === 'madeCashbackEligiblePurchase');
  if (customField) {
    fieldValues.push({ id: customField.id, value: 'false' });
  }

  customField = customFields.find((field) => field.name === 'hasLinkedPaypal');
  if (customField) {
    fieldValues.push({ id: customField.id, value: 'false' });
  }

  customField = customFields.find((field) => field.name === 'hasLinkedCard');
  if (customField) {
    fieldValues.push({ id: customField.id, value: 'false' });
  }
  return fieldValues;
};

const prepareBackfillSyncFields = async (
  user: Partial<IUserDocument>,
  customFields: ActiveCampaignIntegration.FieldIds,
): Promise<ActiveCampaignIntegration.FieldValues> => {
  let fieldValues = await prepareInitialSyncFields(user, customFields, []);
  fieldValues = await prepareDailyUpdatedFields(user, customFields, fieldValues);
  fieldValues = await prepareWeeklyUpdatedFields(user, customFields, fieldValues);
  fieldValues = await prepareMonthlyUpdatedFields(user, customFields, fieldValues);
  fieldValues = await prepareQuarterlyUpdatedFields(user, customFields, fieldValues);
  fieldValues = await prepareYearlyUpdatedFields(user, customFields, fieldValues);

  // items that are usually event-driven
  const userCommissions = await CommissionModel.find({ user: user._id });
  if (userCommissions && userCommissions.length === 0) {
    await ActiveCampaignIntegration.updateMadeCashBackEligiblePurchaseStatus(user);
  }

  await ActiveCampaignIntegration.updateActiveCampaignTags(user);
  await ActiveCampaignIntegration.setLinkedCardData(user._id, customFields, fieldValues);

  return fieldValues;
};

const getBackfillSubscribeList = async (dateJoined: Date): Promise<ActiveCampaignListId[]> => {
  const backfillSubscriberList = [ActiveCampaignListId.GeneralUpdates];
  // add them to AccountUpdates list if registered within the last 45 days
  if (dateJoined && dateJoined > getUtcDate().subtract(45, 'days').toDate()) {
    backfillSubscriberList.push(ActiveCampaignListId.AccountUpdates);
  }
  return backfillSubscriberList;
};

const prepareSyncUsersRequest = async (
  users: Array<Partial<IUser>>,
  customFields: ActiveCampaignIntegration.FieldIds,
  syncType: ActiveCampaignSyncTypes,
): Promise<IContactsImportData> => {
  // skip users with no email
  const contacts = await Promise.all(
    users.filter((user) => {
      if (user.emails && user.emails.length > 0) {
        return true;
      }
      return false;
    }).map(async (user) => {
      const contact: IContactsData = {
        email: user.emails.find(e => e.primary).email,
      };
      let fields: ActiveCampaignIntegration.FieldValues;
      let subscribe: ActiveCampaignListId[];
      switch (syncType) {
        case ActiveCampaignSyncTypes.DAILY:
          fields = await prepareDailyUpdatedFields(user, customFields, []);
          break;
        case ActiveCampaignSyncTypes.WEEKLY:
          fields = await prepareWeeklyUpdatedFields(user, customFields, []);
          break;
        case ActiveCampaignSyncTypes.MONTHLY:
          fields = await prepareMonthlyUpdatedFields(user, customFields, []);
          break;
        case ActiveCampaignSyncTypes.QUARTERLY:
          fields = await prepareMonthlyUpdatedFields(user, customFields, []);
          break;
        case ActiveCampaignSyncTypes.YEARLY:
          fields = await prepareYearlyUpdatedFields(user, customFields, []);
          break;
        case ActiveCampaignSyncTypes.INITIAL:
          contact.first_name = user.name?.split(' ')[0];
          contact.last_name = user.name?.split(' ').pop();
          fields = await prepareInitialSyncFields(user, customFields, []);
          break;
        case ActiveCampaignSyncTypes.BACKFILL:
          contact.first_name = user.name?.split(' ')[0];
          contact.last_name = user.name?.split(' ').pop();
          fields = await prepareBackfillSyncFields(user, customFields);
          subscribe = await getBackfillSubscribeList(user.dateJoined);
          break;
        default:
          console.log('Invalid sync type');
          break;
      }
      contact.fields = fields;
      contact.subscribe = subscribe.map((listId) => ({ listid: listId }));
      return contact;
    }),
  );
  return { contacts };
};

export const onComplete = () => {
  console.log(`${JobNames.SyncActiveCampaign} finished`);
};

export const onFailed = (_: SandboxedJob, err: Error) => {
  console.log(`${JobNames.SyncActiveCampaign} failed`);
  console.log(err);
};

export const exec = async ({ syncType }: IJobData) => {
  try {
    const ac = new ActiveCampaignClient();
    // get list of aggregated user data to create/update data for the associated fields
    const customFields = await ac.getCustomFieldIDs();

    const currentUpdateDateTime = new Date();
    let users;
    const batchSize = 150;
    do {
      // find users where the latestSyncDate is null, doesn't exist, or isn't equal to the current date
      users = await UserModel.find({ $or: [
        { 'integrations.activecampaign.latestSyncDate': null },
        { 'integrations.activecampaign.latestSyncDate': { $exists: false } },
        { 'integrations.activecampaign.latestSyncDate': { $ne: currentUpdateDateTime } },
      ] }).limit(batchSize);
      if (!users || users.length === 0) {
        continue;
      }

      //  compose active campaign request
      const contacts = await prepareSyncUsersRequest(
        users,
        customFields,
        syncType,
      );

      //  send request
      //  NOTE: The maximum payload size of a single bulk_import request must be less than less than 400K bytes (399,999 bytes or less).
      //  including "exclude_automations: true" in the request will prevent automations from running. Could be useful for initial import
      await ac.importContacts(contacts);

      // update the user's latestSyncDate
      await Promise.all(
        users.map(async (user) => {
          await UserModel.findByIdAndUpdate(user._id, {
            'integrations.activecampaign.latestSyncDate': currentUpdateDateTime,
          });
        }),
      );
    } while (users && users.length > 0);
  } catch (err) {
    console.log(err);
  }
};
