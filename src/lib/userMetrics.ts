import dayjs from 'dayjs';
import { FilterQuery, LeanDocument, Types } from 'mongoose';
import { CardModel } from '../models/card';
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
import { CardStatus } from './constants';
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
    !yearlyImpactBreakdown
    || !yearlyImpactBreakdown.length
    || yearlyImpactBreakdown.length <= 0
    || !yearlyImpactBreakdown[0].score
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
  user: IUserDocument,
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

/* Be careful with this functoin. It asks the db to do a really heavy operation
 * and could exceed the memory limitations of the server. This is most likely to
 * happen if passed no start and end dates. */
export const getCashbackCompanies = async (
  startDate?: Date,
  endDate?: Date,
  userId?: Types.ObjectId,
): Promise<{ company: string; count: number; amount: number }[] | null> => {
  try {
    const matchClause: { $and: any[] } = {
      $and: [
        { amount: { $gt: 0 } },
        { company: { $exists: true } },
        { company: { $ne: null } },
        { company: { $ne: [] } },
        { 'company.rating': { $ne: CompanyRating.Negative } },
        { 'company.merchant': { $exists: true } },
        { 'company.merchant': { $ne: null } },
      ],
    };
    if (!!userId) matchClause.$and.push({ user: userId });
    if (!!startDate) matchClause.$and.push({ date: { $gte: startDate } });
    if (!!endDate) matchClause.$and.push({ date: { $lte: endDate } });

    const companies = await TransactionModel.aggregate()
      .lookup({
        from: 'companies',
        localField: 'company',
        foreignField: '_id',
        as: 'company',
      })
      .unwind({ path: '$company' })
      .match(matchClause)
      .sort({ date: -1 })
      .group({
        _id: '$company._id',
        company: { $first: '$company.companyName' },
        count: { $sum: 1 },
        amount: { $sum: '$amount' },
      });
    return !!companies && !!companies.length ? companies : null;
  } catch (err) {
    console.error(err);
    return null;
  }
};

export const getTransactionsWithCashbackCompaniesInDateRange = async (
  user: IUserDocument,
  startDate: Date,
  endDate: Date,
): Promise<IShareableTransaction[] | null> => {
  if (!user || !user._id) return null;
  try {
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
          { amount: { $gt: 0 } },
          { company: { $exists: true } },
          { company: { $ne: null } },
          { company: { $ne: [] } },
          { 'company.rating': { $ne: CompanyRating.Negative } },
          { 'company.merchant': { $exists: true } },
          { 'company.merchant': { $ne: null } },
          { date: { $gte: startDate } },
          { date: { $lte: endDate } },
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
): Promise<IShareableTransaction[] | null> => {
  if (!user || !user._id) return null;
  const oneMonthAgo = dayjs().utc().subtract(1, 'month');
  return getTransactionsWithCashbackCompaniesInDateRange(
    user,
    oneMonthAgo.startOf('month').toDate(),
    oneMonthAgo.endOf('month').toDate(),
  );
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

export const countUnlinkedAndRemovedAccounts = async (
  user: IUserDocument,
): Promise<{ email: string; unlinkedCardsPastThirtyDays: number; removedCardsPastThirtyDays: number }> => {
  try {
    const email = user.emails?.find((e) => e.primary)?.email;
    if (!email) {
      throw Error('No email found for user');
    }
    console.log(`counting unlinked and removed cards for ${email}`);

    const thirtyDaysAgo = dayjs().utc().subtract(30, 'day');
    const cards: { unlinked: number; removed: number }[] = await CardModel.aggregate()
      .match({
        $and: [
          { userId: user._id },
          {
            $or: [
              {
                $and: [
                  { unlinkedDate: { $exists: true } },
                  { unlinkedDate: { $ne: null } },
                  { unlinkedDate: { $gte: thirtyDaysAgo.toDate() } },
                  { unlinkedDate: { $lt: dayjs().utc().toDate() } },
                  { status: CardStatus.Unlinked },
                ],
              },
              {
                $and: [
                  { removedDate: { $exists: true } },
                  { removedDate: { $ne: null } },
                  { removedDate: { $gte: thirtyDaysAgo.toDate() } },
                  { removedDate: { $lt: dayjs().utc().toDate() } },
                  { status: CardStatus.Removed },
                ],
              },
            ],
          },
        ],
      })
      .group({
        _id: '$userId',
        unlinked: { $sum: { $cond: [{ $eq: ['$status', CardStatus.Unlinked] }, 1, 0] } },
        removed: { $sum: { $cond: [{ $eq: ['$status', CardStatus.Removed] }, 1, 0] } },
      });
    const unlinkedCardsPastThirtyDays = cards[0]?.unlinked || 0;
    const removedCardsPastThirtyDays = cards[0]?.removed || 0;
    return { email, unlinkedCardsPastThirtyDays, removedCardsPastThirtyDays };
  } catch (err) {
    console.error(err);
    return { email: '', unlinkedCardsPastThirtyDays: 0, removedCardsPastThirtyDays: 0 };
  }
};

export const getTransactionBreakdownByCompanyRating = async (
  user: IUserDocument,
): Promise<{
  email: string;
  numPositivePurchasesLastThirtyDays: number;
  positivePurchaseDollarsLastThirtyDays: number;
  numNegativePurchasesLastThirtyDays: number;
  negativePurchaseDollarsLastThirtyDays: number;
}> => {
  try {
    const email = user.emails?.find((e) => e.primary)?.email;
    if (!email) {
      throw Error('No email found for user');
    }
    console.log(`preparing spending analysis for ${email}`);

    const userTransactions = await getUserTransactionsPastThirtyDays(user);
    if (!userTransactions) {
      throw new Error(`No transactions found for user with id: ${user?._id}`);
    }

    const positivePurchases = userTransactions.filter(
      (t) => (t.company as ICompanyDocument)?.rating === CompanyRating.Positive,
    );
    // ignore negetive transaction amounts
    const positivePurchaseDollars = positivePurchases.reduce(
      (metric, t) => (t.amount < 0
        ? { sum: metric.sum, skipped: metric.skipped++ }
        : { sum: metric.sum + t.amount, skipped: metric.skipped }),
      { sum: 0, skipped: 0 },
    );
    const negativePurchases = userTransactions.filter(
      (t) => (t.company as ICompanyDocument)?.rating === CompanyRating.Negative,
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
      { sum: 0, skipped: 0 },
    );
    return {
      email,
      numPositivePurchasesLastThirtyDays: !!positivePurchases?.length
        ? positivePurchases.length - positivePurchaseDollars.skipped
        : 0,
      positivePurchaseDollarsLastThirtyDays: roundToPercision(positivePurchaseDollars.sum, 0) || 0,
      numNegativePurchasesLastThirtyDays: !!negativePurchases?.length
        ? negativePurchases.length - negativePurchaseDollars.skipped
        : 0,
      negativePurchaseDollarsLastThirtyDays: roundToPercision(negativePurchaseDollars.sum, 0) || 0,
    };
  } catch (err) {
    console.error(err);
    return {
      email: '',
      numPositivePurchasesLastThirtyDays: 0,
      positivePurchaseDollarsLastThirtyDays: 0,
      numNegativePurchasesLastThirtyDays: 0,
      negativePurchaseDollarsLastThirtyDays: 0,
    };
  }
};
export const getMissedCashBackForDateRange = async (
  user: IUserDocument,
  startDate: Date,
  endDate: Date,
): Promise<{
  id: Types.ObjectId;
  email: string;
  estimatedMissedCommissionsCount: number;
  estimatedMissedCommissionsAmount: number;
  averageMissedCommissionAmount: number;
  largestMissedCommissionAmount: number;
}> => {
  try {
    const userTransactions = await getTransactionsWithCashbackCompaniesInDateRange(user, startDate, endDate);
    if (!userTransactions) {
      throw new Error(`No transactions found for user with id: ${user?._id}`);
    }
    const email = user.emails?.find((e) => e.primary)?.email;

    /* simulate commission payout and record the dollar amount */
    const missedCashbackAmounts = await Promise.all(userTransactions.map(getEstimatedMissedCommissionAmounts));

    // calculate the largest missed comission amount
    // calculate the average missed comission amount
    let averageMissedCommissionAmount = 0;
    let largestMissedCommissionAmount = 0;
    if (missedCashbackAmounts?.length > 0) {
      averageMissedCommissionAmount = missedCashbackAmounts.reduce((prev, current) => prev + current, 0) / missedCashbackAmounts.length;
      largestMissedCommissionAmount = Math.max(...missedCashbackAmounts);
    }

    // adding up all missed commissions
    const missedCashbackDollars = missedCashbackAmounts.reduce((prev, current) => prev + current, 0);

    return {
      id: user._id,
      email,
      estimatedMissedCommissionsAmount: missedCashbackDollars,
      estimatedMissedCommissionsCount: missedCashbackAmounts.length,
      averageMissedCommissionAmount,
      largestMissedCommissionAmount,
    };
  } catch (err) {
    return {
      id: null,
      email: '',
      estimatedMissedCommissionsAmount: 0,
      estimatedMissedCommissionsCount: 0,
      averageMissedCommissionAmount: 0,
      largestMissedCommissionAmount: 0,
    };
  }
};

export const getWeeklyMissedCashBack = async (
  user: IUserDocument,
): Promise<{
  id: Types.ObjectId;
  email: string;
  estimatedWeeklyMissedCommissionsCount: number;
  estimatedWeeklyMissedCommissionsAmount: number;
}> => {
  const oneWeekAgo = dayjs().utc().subtract(1, 'week');
  const metric = await getMissedCashBackForDateRange(
    user,
    oneWeekAgo.startOf('week').toDate(),
    oneWeekAgo.endOf('week').toDate(),
  );
  return {
    id: metric.id,
    email: metric.email,
    estimatedWeeklyMissedCommissionsCount: metric.estimatedMissedCommissionsCount,
    estimatedWeeklyMissedCommissionsAmount: metric.estimatedMissedCommissionsAmount,
  };
};

export const getMonthlyMissedCashBack = async (
  user: IUserDocument,
): Promise<{
  id: Types.ObjectId;
  email: string;
  estimatedMonthlyMissedCommissionsCount: number;
  estimatedMonthlyMissedCommissionsAmount: number;
}> => {
  const oneMonthAgo = dayjs().utc().subtract(1, 'month');
  const metric = await getMissedCashBackForDateRange(
    user,
    oneMonthAgo.startOf('month').toDate(),
    oneMonthAgo.endOf('month').toDate(),
  );
  return {
    id: metric.id,
    email: metric.email,
    estimatedMonthlyMissedCommissionsCount: metric.estimatedMissedCommissionsCount,
    estimatedMonthlyMissedCommissionsAmount: metric.estimatedMissedCommissionsAmount,
  };
};

export const getUsersWithCommissionsInDateRange = async (startDate: Date, endDate: Date): Promise<Types.ObjectId[]> => {
  const users = await CommissionModel.aggregate()
    .match({
      $and: [
        { 'integrations.wildfire': { $exists: true } },
        { 'integrations.wildfire': { $ne: null } },
        { createdOn: { $gte: startDate } },
        { creaetdOn: { $lte: endDate } },
      ],
    })
    .group({
      _id: '$user',
    });
  return users?.map((u) => u?._id) || [];
};

export const getUsersWithCommissionsLastMonth = async (): Promise<Types.ObjectId[]> => {
  const oneMonthAgo = dayjs().utc().subtract(1, 'month');
  return getUsersWithCommissionsInDateRange(oneMonthAgo.startOf('month').toDate(), oneMonthAgo.endOf('month').toDate());
};

export const getUsersWithCommissionsLastWeek = async (): Promise<Types.ObjectId[]> => {
  const oneWeekAgo = dayjs().utc().subtract(1, 'week');
  return getUsersWithCommissionsInDateRange(oneWeekAgo.startOf('week').toDate(), oneWeekAgo.endOf('week').toDate());
};

export const getUsersWithTransactionsInDateRange = async (
  startDate?: Date,
  endDate?: Date,
): Promise<Types.ObjectId[]> => {
  const matchClause: { $and: any[] } = {
    $and: [{ company: { $exists: true } }, { company: { $ne: null } }],
  };
  if (!!startDate) matchClause.$and.push({ date: { $gte: startDate } });
  if (!!endDate) matchClause.$and.push({ date: { $lte: endDate } });
  const users = await TransactionModel.aggregate().match(matchClause).group({
    _id: '$user',
  });
  return users?.map((u) => u?._id) || [];
};
// this only cares about users with transactions that we matched to a company
export const getUsersWithTransactionsLastMonth = async (): Promise<Types.ObjectId[]> => {
  const oneMonthAgo = dayjs().utc().subtract(1, 'month');
  return getUsersWithTransactionsInDateRange(
    oneMonthAgo.startOf('month').toDate(),
    oneMonthAgo.endOf('month').toDate(),
  );
};

export const getUsersWithTransactionsLastWeek = async (): Promise<Types.ObjectId[]> => {
  const oneWeekAgo = dayjs().utc().subtract(1, 'week');
  return getUsersWithTransactionsInDateRange(oneWeekAgo.startOf('week').toDate(), oneWeekAgo.endOf('week').toDate());
};
export const getUsersWithTransactions = async (): Promise<Types.ObjectId[]> => getUsersWithTransactionsInDateRange();

export const getUsersWithUnlinkedOrRemovedAccountsPastThirtyDays = async (): Promise<Types.ObjectId[]> => {
  const thirtyDaysAgo = dayjs().utc().subtract(30, 'day');

  const users = await CardModel.aggregate()
    .match({
      $or: [
        {
          $and: [
            { unlinkedDate: { $exists: true } },
            { unlinkedDate: { $ne: null } },
            { unlinkedDate: { $gte: thirtyDaysAgo.toDate() } },
            { unlinkedDate: { $lt: dayjs().utc().toDate() } },
            { status: CardStatus.Unlinked },
          ],
        },
        {
          $and: [
            { removedDate: { $exists: true } },
            { removedDate: { $ne: null } },
            { removedDate: { $gte: thirtyDaysAgo.toDate() } },
            { removedDate: { $lt: dayjs().utc().toDate() } },
            { status: CardStatus.Removed },
          ],
        },
      ],
    })
    .group({
      _id: '$userId',
    });
  return users?.map((u) => u?._id) || [];
};
// only pulls users with transactions in which we matched the company and it has a positive or negative rating
export const getUsersWithTransactionPastThirtyDays = async (): Promise<Types.ObjectId[]> => {
  const thirtyDaysAgo = dayjs().utc().subtract(30, 'day');

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
