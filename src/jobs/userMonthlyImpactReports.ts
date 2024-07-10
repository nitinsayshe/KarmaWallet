import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { FilterQuery } from 'mongoose';
import { sectorsToExcludeFromTransactions, transactionStatusesToExcludeFromImpactReports, transactionTypesToExcludeFromImpactReports } from '../lib/constants/transaction';
import { CompanyModel } from '../models/company';
import { SectorModel } from '../models/sector';
import { ITransactionDocument, TransactionModel } from '../models/transaction';
import { IUserDocument } from '../models/user';
import { IUserImpactMonthData } from '../models/userImpactTotals';
import { UserMontlyImpactReportModel } from '../models/userMonthlyImpactReport';
import { getMonthlyImpactBreakdown, getMonthStartDate, getUserImpactRatings } from '../services/impact/utils';
import {
  getOffsetTransactionsCount,
  getOffsetTransactionsTotal,
  getRareOffsetAmount,
  getTotalEmissions,
} from '../services/impact/utils/carbon';

dayjs.extend(utc);

// takes a group of transactions from a single month
// returns emissions and offset data for the given user
export const getCarbonDataForMonth = async (transactions: ITransactionDocument[], user: IUserDocument) => {
  const monthStart = getMonthStartDate(dayjs(transactions[0].date));
  const monthEnd = monthStart.endOf('month');

  const offsetQuery: FilterQuery<ITransactionDocument> = {
    $and: [{ user: user._id }, { date: { $gte: monthStart.toDate() } }, { date: { $lte: monthEnd.toDate() } }],
  };

  // offsets
  const offsetDonationsCount = await getOffsetTransactionsCount(offsetQuery);
  const offsetDonationsAmount = await getOffsetTransactionsTotal(offsetQuery);
  const offsetDonationsOffset = await getRareOffsetAmount(offsetQuery);

  // carbon
  let totalEmissions = 0;
  let monthlyEmissions = 0;

  const { mt: totalMT } = await getTotalEmissions(user._id);
  totalEmissions = totalMT;

  // change to total for month
  const { mt: monthTotalMT } = await getTotalEmissions(user._id, {
    date: { $gte: monthStart.toDate(), $lte: monthEnd.toDate() },
  });
  monthlyEmissions = monthTotalMT;

  // monthly total
  const netEmissions = monthlyEmissions - offsetDonationsOffset;

  return {
    offsets: {
      donationsCount: offsetDonationsCount,
      totalDonated: offsetDonationsAmount,
      totalOffset: offsetDonationsOffset,
    },
    totalEmissions,
    netEmissions,
    monthlyEmissions,
  };
};

// groups transactions by month into an object with stringified dates as keys
export const groupTransactionsByMonth = (transactions: ITransactionDocument[]) => {
  const monthlyBreakdown: { [key: string]: ITransactionDocument[] } = {};

  for (const transaction of transactions) {
    const date = dayjs(transaction.date).utc();
    if (!monthlyBreakdown.hasOwnProperty(date.format('YYYY-MM'))) {
      monthlyBreakdown[date.format('YYYY-MM')] = [];
    }

    monthlyBreakdown[date.format('YYYY-MM')].push(transaction);
  }

  return monthlyBreakdown;
};

export const getGroupedTransactionsAndMonthlyBreakdown = async (
  user: IUserDocument,
  generateFullHistory: boolean,
  lastMonthStart: dayjs.Dayjs,
): Promise<{
  monthlyImpactBreakdown: IUserImpactMonthData[];
  monthlyBreakdown: { [key: string]: ITransactionDocument[] };
}> => {
  const query: FilterQuery<ITransactionDocument> = {
    $and: [
      { user },
      { company: { $ne: null } },
      { sector: { $nin: sectorsToExcludeFromTransactions } },
      { amount: { $gt: 0 } },
      { reversed: { $ne: true } },
      { type: { $nin: transactionTypesToExcludeFromImpactReports } },
      { status: { $nin: transactionStatusesToExcludeFromImpactReports } },
    ],
  };

  const lastMonthEnd = lastMonthStart.endOf('month');
  if (generateFullHistory) {
    query.$and.push({ date: { $lte: lastMonthEnd.toDate() } });
  } else {
    // only pull transactions from the last month
    query.$and.push({ date: { $gte: lastMonthStart.toDate() } });
    query.$and.push({ date: { $lte: lastMonthEnd.toDate() } });
  }

  const ratings = await getUserImpactRatings();
  const transactions = await TransactionModel.find(query)
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
  return {
    monthlyBreakdown: groupTransactionsByMonth(transactions),
    monthlyImpactBreakdown: getMonthlyImpactBreakdown(transactions, ratings),
  };
};

const processMonthlyBreakdown = async (
  user: IUserDocument,
  monthTransactions: ITransactionDocument[],
  monthlyImpactBreakdown: IUserImpactMonthData[],
  count: number,
  errorCount: number,
): Promise<{ count: number; errorCount: number }> => {
  if (!monthTransactions.length) return { count, errorCount };

  try {
    // get impact data for this month
    const impactData = monthlyImpactBreakdown.find(
      (data) => dayjs(data.date).utc().format('YYYY-MM') === dayjs(monthTransactions[0].date).utc().format('YYYY-MM'),
    );

    // get carbon data for this month
    const carbonData = await getCarbonDataForMonth(monthTransactions, user as IUserDocument);

    const thisReportStartDate = getMonthStartDate(dayjs(monthTransactions[0].date).utc());
    const thisReportEndDate = thisReportStartDate.endOf('month');

    let existingReport = await UserMontlyImpactReportModel.findOne({
      $and: [
        { user: user._id },
        { date: { $gte: thisReportStartDate.toDate() } },
        { date: { $lte: thisReportEndDate.toDate() } },
      ],
    });

    if (existingReport) {
      existingReport.transactions = monthTransactions;
      existingReport.impact = impactData;
      existingReport.carbon = carbonData;
    } else {
      // create new report
      existingReport = new UserMontlyImpactReportModel({
        user,
        transactions: monthTransactions,
        impact: impactData,
        carbon: carbonData,
        date: dayjs(monthTransactions[0].date).toDate(),
        createdOn: dayjs().utc().toDate(),
      });
    }

    await existingReport.save();

    count += 1;
  } catch (err) {
    errorCount += 1;
    console.log('[-] error creating monthly impact report for user', user._id, err);
  }
  return { count, errorCount };
};

export const generateMonthlyImpactReportForUser = async (
  user: IUserDocument,
  generateFullHistory: boolean,
  lastMonthStart: dayjs.Dayjs,
  count: number,
  errorCount: number,
): Promise<{ count: number; errorCount: number }> => {
  let monthlyBreakdown: { [key: string]: ITransactionDocument[] };
  let monthlyImpactBreakdown: IUserImpactMonthData[];

  try {
    ({ monthlyBreakdown, monthlyImpactBreakdown } = await getGroupedTransactionsAndMonthlyBreakdown(
      user,
      generateFullHistory,
      lastMonthStart,
    ));
  } catch (e) {
    console.error(e);
    return { count, errorCount };
  }

  for (const monthTransactions of Object.values(monthlyBreakdown)) {
    ({ count, errorCount } = await processMonthlyBreakdown(
      user,
      monthTransactions,
      monthlyImpactBreakdown,
      count,
      errorCount,
    ));
  }
  return { count, errorCount };
};

interface IJobData {
  generateFullHistory?: boolean;
  uid?: string;
}

export const exec = async (jobData: IJobData = {}) => {
  console.log(jobData);
  // const generateFullHistory = !!jobData.generateFullHistory;
  // const { uid } = jobData;
  // const userQuery: FilterQuery<IUserDocument> = !!uid ? { _id: uid } : {};

  // if (!!generateFullHistory) {
  //   // clearing any existing history
  //   // ...needed for when user links/relinks a card. have
  //   // to delete existing histories (if any exist), and
  //   // then recalc all with new card data.
  //   await UserMontlyImpactReportModel.deleteMany(userQuery);
  // }

  // const lastMonthStart = getMonthStartDate(dayjs().utc().subtract(1, 'month'));

  // console.log(
  //   `\ngenerating user monthly impact reports ${generateFullHistory ? 'for entire history' : `for ${lastMonthStart.format('MMM, YYYY')}`
  //   }${!!uid ? ` for user: ${uid}` : ''}...\n`,
  // );
  // const users = await UserModel.find(userQuery).lean();

  // let count = 0;
  // let errorCount = 0;

  // for (const user of users) {
  //   console.log(`[+] generating monthly impact reports for user: ${user._id}`);
  //   ({ count, errorCount } = await generateMonthlyImpactReportForUser(
  //     user as IUserDocument,
  //     generateFullHistory,
  //     lastMonthStart,
  //     count,
  //     errorCount,
  //   ));
  // }

  // console.log(`\n[+] ${count} monthly impact reports generated for ${users.length} users\n`);
  // if (errorCount > 0) console.log(`...but ${errorCount} errors occurred\n`);
};
