import dayjs from 'dayjs';
import { add } from 'lodash';
import { FilterQuery, LeanDocument, Types } from 'mongoose';
import { CommissionModel, KarmaCommissionStatus } from '../models/commissions';
import { CompanyModel, ICompanyDocument, IShareableCompany } from '../models/company';
import { IShareableMerchant } from '../models/merchant';
import { MerchantRateModel } from '../models/merchantRate';
import { SectorModel } from '../models/sector';
import { IShareableTransaction, ITransactionDocument, TransactionModel } from '../models/transaction';
import { IUserDocument } from '../models/user';
import { UserImpactYearData } from '../models/userImpactTotals';
import { UserLogModel } from '../models/userLog';
import { UserMontlyImpactReportModel } from '../models/userMonthlyImpactReport';
import { getUserImpactRatings, getYearlyImpactBreakdown } from '../services/impact/utils';
import { CompanyRating } from './constants/company';
import { sectorsToExcludeFromTransactions } from './constants/transaction';
import { roundToPercision } from './misc';

export type LeanTransactionDocuments = LeanDocument<ITransactionDocument & { _id: any }>[];

export const getYearlyKarmaScore = async (user: IUserDocument): Promise<number> => {
  const oneYearAgo = dayjs().utc().subtract(1, 'year');
  const query: FilterQuery<ITransactionDocument> = {
    $and: [
      { user },
      { company: { $ne: null } },
      { sector: { $nin: sectorsToExcludeFromTransactions } },
      { amount: { $gt: 0 } },
      { reversed: { $ne: true } },
      { date: { $gte: oneYearAgo.startOf('year').toDate() } },
      { date: { $lte: oneYearAgo.endOf('year').toDate() } },
    ],
  };

  let transactions: ITransactionDocument[];
  let ratings: [number, number][];
  let yearlyImpactBreakdown: UserImpactYearData[];

  try {
    transactions = await TransactionModel.find(query)
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
    yearlyImpactBreakdown = getYearlyImpactBreakdown(transactions, ratings);
  } catch (err) {
    console.error(err);
    return 0;
  }

  if (
    !yearlyImpactBreakdown ||
    !yearlyImpactBreakdown.length ||
    yearlyImpactBreakdown.length <= 0 ||
    !yearlyImpactBreakdown[0].score
  ) {
    return 0;
  }
  return roundToPercision(yearlyImpactBreakdown[0].score, 2);
};

// Gets all commissions from the previous year. Not rolling 365 days.
export const getYearlyCommissionTotal = async (user: IUserDocument): Promise<number> => {
  try {
    const oneYearAgo = dayjs().utc().subtract(1, 'year');
    const commissions = await CommissionModel.find({
      $and: [
        { user: user._id },
        {
          status: {
            $nin: [KarmaCommissionStatus.Canceled],
          },
        },
        { createdOn: { $gte: oneYearAgo.startOf('year').toDate() } },
        { createdOn: { $lte: oneYearAgo.endOf('year').toDate() } },
      ],
    }).lean();
    if (!commissions) {
      return 0;
    }
    const commissionSum = commissions.reduce((partialSum, commission) => partialSum + commission.amount, 0);
    return commissionSum;
  } catch (err) {
    console.error(err);
    return 0;
  }
};

export const getMonthlyCommissionTotal = async (user: IUserDocument): Promise<number> => {
  try {
    const oneMonthAgo = dayjs().utc().subtract(1, 'month');
    const commissions = await CommissionModel.find({
      $and: [
        { user: user._id },
        {
          status: {
            $nin: [KarmaCommissionStatus.Canceled],
          },
        },
        { createdOn: { $gte: oneMonthAgo.startOf('month').toDate() } },
        { createdOn: { $lte: oneMonthAgo.endOf('month').toDate() } },
      ],
    })
      .lean()
      .sort({ date: -1 });
    if (!commissions) {
      return 0;
    }
    const commissionSum = commissions.reduce((partialSum, commission) => partialSum + commission.amount, 0);
    return commissionSum;
  } catch (err) {
    console.error(err);
    return 0;
  }
};

export const getUserTransactionsPastThirtyDays = async (
  user: IUserDocument
): Promise<IShareableTransaction[] | null> => {
  if (!user || !user._id) return null;
  try {
    const thirtyDaysAgo = dayjs().utc().subtract(30, 'day');

    const transactions = await TransactionModel.aggregate()
      .match({
        $and: [
          { user: user._id },
          { company: { $exists: true } },
          { company: { $ne: null } },
          { company: { $ne: [] } },
          { date: { $gte: thirtyDaysAgo.toDate() } },
          { date: { $lte: dayjs().toDate() } },
        ],
      })
      .lookup({
        from: 'companies',
        localField: 'company',
        foreignField: '_id',
        as: 'company',
      })
      .unwind({ path: '$company', preserveNullAndEmptyArrays: false })
      .match({
        $and: [
          { 'company.rating': { $exists: true } },
          { 'company.rating': { $ne: null } },
          { 'company.rating': { $ne: CompanyRating.Neutral } },
        ],
      })
      .sort({ date: -1 });

    return !!transactions && !!transactions.length ? transactions : null;
  } catch (err) {
    console.error(err);
    return null;
  }
};

export const getMonthlyTransactionsWithCashbackCompanies = async (
  user: IUserDocument,
  excludeList: LeanTransactionDocuments
): Promise<IShareableTransaction[] | null> => {
  if (!user || !user._id) return null;
  try {
    const oneMonthAgo = dayjs().utc().subtract(1, 'month');

    const transactions = await TransactionModel.aggregate()
      .lookup({
        from: 'companies',
        localField: 'company',
        foreignField: '_id',
        as: 'company',
      })
      .unwind({ path: '$company' })
      .match({
        $and: [
          { user: user._id },
          { _id: { $nin: excludeList.map((t) => t._id) } },
          { company: { $exists: true } },
          { company: { $ne: null } },
          { company: { $ne: [] } },
          { 'company.rating': { $ne: CompanyRating.Negative } },
          { 'company.merchant': { $exists: true } },
          { 'company.merchant': { $ne: null } },
          { date: { $gte: oneMonthAgo.startOf('month').toDate() } },
          { date: { $lte: oneMonthAgo.endOf('month').toDate() } },
        ],
      })
      .sort({ date: -1 });
    return !!transactions && !!transactions.length ? transactions : null;
  } catch (err) {
    console.error(err);
    return null;
  }
};

export const getAvailableCommissionPayouts = async (user: IUserDocument): Promise<number> => {
  try {
    const commissions = await CommissionModel.find({
      $and: [
        { user: user._id },
        {
          status: {
            $nin: [KarmaCommissionStatus.PaidToUser, KarmaCommissionStatus.Canceled],
          },
        },
      ],
    }).lean();
    if (!commissions) {
      return 0;
    }

    const commissionSum = commissions.reduce((partialSum, commission) => partialSum + commission.amount, 0);
    return commissionSum;
  } catch (err) {
    console.error(err);
    return 0;
  }
};

export const getYearlyEmissionsTotal = async (user: IUserDocument): Promise<number> => {
  try {
    const oneYearAgo = dayjs().utc().subtract(1, 'year');
    const impactReports = await UserMontlyImpactReportModel.find({
      $and: [
        { user: user._id },
        { date: { $gte: oneYearAgo.startOf('year').toDate() } },
        { date: { $lte: oneYearAgo.endOf('year').toDate() } },
      ],
    }).lean();

    if (!impactReports) {
      return 0;
    }
    const emissionsSum = impactReports.reduce((partialSum, report) => partialSum + report.carbon.monthlyEmissions, 0);
    return emissionsSum;
  } catch (err) {
    console.error(err);
    return 0;
  }
};

export const getWeeklyLoginCount = async (user: IUserDocument): Promise<number> => {
  try {
    const oneWeekAgo = dayjs().utc().subtract(1, 'week');
    const logins = await UserLogModel.find({
      $and: [
        { userId: user._id },
        { date: { $gte: oneWeekAgo.startOf('week').toDate() } },
        { date: { $lte: oneWeekAgo.endOf('week').toDate() } },
      ],
    }).lean();
    return logins ? logins.length : 0;
  } catch (err) {
    console.error(err);
    return 0;
  }
};

export const getMonthlyLoginCount = async (user: IUserDocument): Promise<number> => {
  try {
    const oneMonthAgo = dayjs().utc().subtract(1, 'month');
    const logins = await UserLogModel.find({
      $and: [
        { userId: user._id },
        { date: { $gte: oneMonthAgo.startOf('month').toDate() } },
        { date: { $lte: oneMonthAgo.endOf('month').toDate() } },
      ],
    }).lean();
    return logins ? logins.length : 0;
  } catch (err) {
    console.error(err);
    return 0;
  }
};

export const getYearlyLoginCount = async (user: IUserDocument): Promise<number> => {
  try {
    const oneYearAgo = dayjs().utc().subtract(1, 'year');
    const logins = await UserLogModel.find({
      $and: [
        { userId: user._id },
        { date: { $gte: oneYearAgo.startOf('year').toDate() } },
        { date: { $lte: oneYearAgo.endOf('year').toDate() } },
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
export const getTotalLoginCount = async (user: IUserDocument): Promise<number> => {
  try {
    const logins = await UserLogModel.find({
      $and: [{ userId: user._id }, { $exists: { date: true } }, { $ne: { date: null } }],
    }).lean();
    return logins ? logins.length : 0;
  } catch (err) {
    console.error(err);
    return 0;
  }
};

const getEstimatedMissedCommissionAmounts = async (transaction: IShareableTransaction): Promise<number> => {
  // get the merchant rate for the transaction merchant
  // TODO: handle matching to specific category rate
  const merchantId = String(((transaction?.company as IShareableCompany)?.merchant as IShareableMerchant)?._id);
  let merchantRates = await MerchantRateModel.find({
    merchant: merchantId.toString(),
  });
  // filter out any that are not a percentage for now
  // TODO: handle flat rates
  if (!merchantRates) {
    return 0;
  }
  merchantRates = merchantRates.filter((mr) => mr?.integrations?.wildfire?.Kind === 'PERCENTAGE');

  // find the hightest rate from the merchant rates
  const highestRate = merchantRates.reduce((prev, current) => {
    const curr = current?.integrations?.wildfire?.Amount || 0;
    return curr > prev ? curr : prev;
  }, 0);

  return (highestRate / 100) * transaction.amount;
};

export const getTransactionBreakdownByCompanyRating = async (
  user: IUserDocument
): Promise<{
  email: string;
  numPositivePurchasesLastThirtyDays: number;
  positivePurchaseDollarsLastThirtyDays: number;
  numNegativePurchasesLastThirtyDays: number;
  negativePurchaseDollarsLastThirtyDays: number;
}> => {
  try {
    const email = user.emails?.find((e) => e.primary)?.email;
    if (!!email && email === 'andy@theimpactkarma.com') {
      console.log(`preparing spending analysis for ${email}`);
    }

    const userTransactions = await getUserTransactionsPastThirtyDays(user);
    if (!userTransactions) {
      throw new Error(`No transactions found for user with id: ${user?._id}`);
    }

    const positivePurchases = userTransactions.filter(
      (t) => (t.company as ICompanyDocument)?.rating === CompanyRating.Positive
    );
    const positivePurchaseDollars = positivePurchases.reduce(
      (metric, t) => {
        // ignore negetive transaction amounts
        return t.amount < 0
          ? { sum: metric.sum, skipped: metric.skipped++ }
          : { sum: metric.sum + t.amount, skipped: metric.skipped };
      },
      { sum: 0, skipped: 0 }
    );
    const negativePurchases = userTransactions.filter(
      (t) => (t.company as ICompanyDocument)?.rating === CompanyRating.Negative
    );
    const negativePurchaseDollars = negativePurchases.reduce(
      (metric, t) => {
        // ignore negetive transaction amounts
        if (t.amount < 0) {
          console.log(`skipping user with email: ${email}`);
          return { sum: metric.sum, skipped: metric.skipped++ };
        }
        return { sum: metric.sum + t.amount, skipped: metric.skipped };
      },
      { sum: 0, skipped: 0 }
    );
    return {
      email,
      numPositivePurchasesLastThirtyDays: positivePurchases?.length - positivePurchaseDollars.skipped || 0,
      positivePurchaseDollarsLastThirtyDays: roundToPercision(positivePurchaseDollars.sum, 0) || 0,
      numNegativePurchasesLastThirtyDays: negativePurchases?.length - negativePurchaseDollars.skipped || 0,
      negativePurchaseDollarsLastThirtyDays: roundToPercision(negativePurchaseDollars.sum, 0) || 0,
    };
  } catch (err) {
    return {
      email: '',
      numPositivePurchasesLastThirtyDays: 0,
      positivePurchaseDollarsLastThirtyDays: 0,
      numNegativePurchasesLastThirtyDays: 0,
      negativePurchaseDollarsLastThirtyDays: 0,
    };
  }
};

export const getMonthlyMissedCashBack = async (
  user: IUserDocument
): Promise<{
  email: string;
  estimatedMonthlyMissedCommissionsCount: number;
  estimatedMonthlyMissedCommissionsAmount: number;
}> => {
  try {
    /*  TODO:  filter the transactions for only those that are not in the commissions list */
    /* We  don't have the information to do this right now, so we could just assign $0 missed cashback to users that have shopped through KW that month */
    /* So users with $0 missed cashback will either not have a card linked or they will have a card linked but not have shopped through KW that month  */
    const excludeList: LeanTransactionDocuments = [];

    const userTransactions = await getMonthlyTransactionsWithCashbackCompanies(user, excludeList);
    if (!userTransactions) {
      throw new Error(`No transactions found for user with id: ${user?._id}`);
    }
    const email = user.emails?.find((e) => e.primary)?.email;

    /* simulate commission payout and record the dollar amount */
    const monthlyMissedCashbackAmounts = await Promise.all(userTransactions.map(getEstimatedMissedCommissionAmounts));

    const monthlyMissedCashbackDollars = monthlyMissedCashbackAmounts.reduce((prev, current) => prev + current, 0);
    return {
      email,
      estimatedMonthlyMissedCommissionsAmount: monthlyMissedCashbackDollars,
      estimatedMonthlyMissedCommissionsCount: monthlyMissedCashbackAmounts.length,
    };
  } catch (err) {
    return {
      email: '',
      estimatedMonthlyMissedCommissionsAmount: 0,
      estimatedMonthlyMissedCommissionsCount: 0,
    };
  }
};

export const getUsersWithCommissionsLastMonth = async (): Promise<Types.ObjectId[]> => {
  const oneMonthAgo = dayjs().utc().subtract(1, 'month');
  const users = await CommissionModel.aggregate()
    .match({
      $and: [
        { 'integrations.wildfire': { $exists: true } },
        { 'integrations.wildfire': { $ne: null } },
        { createdOn: { $gte: oneMonthAgo.startOf('month').toDate() } },
        { creaetdOn: { $lte: oneMonthAgo.endOf('month').toDate() } },
      ],
    })
    .group({
      _id: '$user',
    });
  return users?.map((u) => u?._id) || [];
};

// this only cares about users with transactions that we matched to a company
export const getUsersWithTransactionsLastMonth = async (): Promise<Types.ObjectId[]> => {
  const oneMonthAgo = dayjs().utc().subtract(1, 'month');
  const users = await TransactionModel.aggregate()
    .match({
      $and: [
        { date: { $gte: oneMonthAgo.startOf('month').toDate() } },
        { date: { $lte: oneMonthAgo.endOf('month').toDate() } },
        { company: { $exists: true } },
        { company: { $ne: null } },
      ],
    })
    .group({
      _id: '$user',
    });
  return users?.map((u) => u?._id) || [];
};

// only pulls users with transactions in which we matched the company and it has a positive or negative rating
export const getUsersWithTransactionPastThirtyDays = async (): Promise<Types.ObjectId[]> => {
  const thirtyDaysAgo = dayjs().utc().subtract(30, 'day');

  console.log('thirtyDaysAgo: ', thirtyDaysAgo.toString(), ' Today: ', dayjs().toString());
  const users = await TransactionModel.aggregate()
    .match({
      $and: [
        { date: { $gte: thirtyDaysAgo.toDate() } },
        { date: { $lte: dayjs().toDate() } },
        { company: { $exists: true } },
        { company: { $ne: null } },
      ],
    })
    .lookup({
      from: 'companies',
      localField: 'company',
      foreignField: '_id',
      as: 'company',
    })
    .unwind({
      path: '$company',
      preserveNullAndEmptyArrays: false,
    })
    .match({
      $and: [
        { 'company.rating': { $exists: true } },
        { 'company.rating': { $ne: null } },
        { 'company.rating': { $ne: CompanyRating.Neutral } },
      ],
    })
    .group({
      _id: '$user',
    });
  return users?.map((u) => u?._id) || [];
};
