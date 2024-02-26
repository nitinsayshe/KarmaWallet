import dayjs from 'dayjs';
import fs from 'fs';
import { parse } from 'json2csv';
import { PaginateResult, Types } from 'mongoose';
import path from 'path';
import { SafeParseError, z } from 'zod';
import { roundToPercision } from '../../lib/misc';
import { IUser, IUserDocument } from '../../models/user';
import { iterateOverUsersAndExecWithDelay, UserIterationRequest, UserIterationResponse } from '../user/utils';
import {
  getCashbackCompanies,
  getMissedCashBackForDateRange,
  getUsersWithCommissionsInDateRange,
  getUsersWithTransactionsInDateRange,
} from '../user/utils/metrics';

type CashbackUserReport = {
  userId: Types.ObjectId;
  totalMissedCashback: number;
  totalMissedCashbackTransactions: number;
  averageCashbackMissedPerTransaction: number;
  largestMissedCashbackTransactionAmount: number;
};

type CashbackAnalysisWeekReports = {
  totalMissedCashback: number;
  totalMissedCashbackTransactions: number;
  averageCashbackMissedPerTransaction: number;
  userReports: CashbackUserReport[];
  startDate: Date;
  endDate: Date;
}[];

type CashbackAnalysisReport = {
  weekReports: CashbackAnalysisWeekReports;
  totalMissedCashback: number;
  totalMissedCashbackTransactions: number;
  averageMissedCashback: number;
};

type RangedCashbackSimulationFields = {
  startDate: Date;
  endDate: Date;
};

const runUserCashbackSimulation = async (
  req: UserIterationRequest<RangedCashbackSimulationFields>,
  userBatch: PaginateResult<IUser>,
): Promise<UserIterationResponse<CashbackUserReport>[]> => {
  let missedCashbackMetrics = await Promise.all(
    userBatch?.docs?.map(async (user) => getMissedCashBackForDateRange(user as unknown as IUserDocument, req.fields?.startDate, req.fields?.endDate)),
  );
  const emailSchema = z.string().email();
  missedCashbackMetrics = missedCashbackMetrics?.filter((metric) => {
    const validationResult = emailSchema.safeParse(metric.email);
    return !!metric.email && !(validationResult as SafeParseError<string>)?.error;
  });

  const userReports: UserIterationResponse<CashbackUserReport>[] = missedCashbackMetrics?.map((metric) => {
    const {
      id,
      estimatedMissedCommissionsAmount,
      estimatedMissedCommissionsCount,
      averageMissedCommissionAmount,
      largestMissedCommissionAmount,
    } = metric;
    return {
      userId: id,
      fields: {
        userId: id,
        totalMissedCashback: roundToPercision(estimatedMissedCommissionsAmount, 0),
        totalMissedCashbackTransactions: estimatedMissedCommissionsCount,
        averageCashbackMissedPerTransaction: roundToPercision(averageMissedCommissionAmount, 0),
        largestMissedCashbackTransactionAmount: roundToPercision(largestMissedCommissionAmount, 0),
      },
    };
  });
  return userReports;
};

const runCashbackSimulation = async (startDate: Date, endDate: Date): Promise<CashbackUserReport[]> => {
  // filter out users with commissions this month
  const usersWithCommissionsInDateRange = await getUsersWithCommissionsInDateRange(startDate, endDate);
  const usersWithTransactionsInDateRange = await getUsersWithTransactionsInDateRange(startDate, endDate);
  const msDelayBetweenBatches = 2000;

  const request: UserIterationRequest<RangedCashbackSimulationFields> = {
    batchQuery: {
      $and: [{ _id: { $nin: usersWithCommissionsInDateRange } }, { _id: { $in: usersWithTransactionsInDateRange } }],
    },
    batchLimit: 100,
    fields: {
      startDate,
      endDate,
    },
  };
  const report: UserIterationResponse<CashbackUserReport>[] = await iterateOverUsersAndExecWithDelay(
    request,
    runUserCashbackSimulation,
    msDelayBetweenBatches,
  );

  return report.map((r: UserIterationResponse<CashbackUserReport>) => ({ ...r.fields, userId: r.userId }));
};

const getPrevWeeksCashBackReport = async (
  prevWeeks: { startDate: Date; endDate: Date }[],
): Promise<CashbackAnalysisReport> => {
  try {
    const report: CashbackAnalysisReport = {
      weekReports: [],
      totalMissedCashback: 0,
      averageMissedCashback: 0,
      totalMissedCashbackTransactions: 0,
    };
    report.weekReports = await Promise.all(
      prevWeeks.map(async (week) => {
        const startDate = dayjs(week.startDate).format('MM-DD-YYYY');
        const endDate = dayjs(week.endDate).format('MM-DD-YYYY');
        console.log(`running cashback simulation for the date range: ${startDate} to ${endDate}`);
        // run cashback simulation on all users for this week
        const cashbackSimulation = await runCashbackSimulation(week.startDate, week.endDate);
        // sum up the total missed cashback for this week
        const totalMissedCashback = cashbackSimulation.reduce((acc, curr) => acc + curr.totalMissedCashback, 0);
        // average the missed cashback per transaction for this week
        const totalMissedCashbackTransactions = cashbackSimulation.reduce(
          (acc, curr) => acc + curr.totalMissedCashbackTransactions,
          0,
        );
        const averageMissedCommissionAmount = totalMissedCashbackTransactions > 0
          ? roundToPercision(totalMissedCashback / totalMissedCashbackTransactions, 2)
          : 0;

        const weekReport = {
          totalMissedCashback,
          totalMissedCashbackTransactions,
          averageCashbackMissedPerTransaction: averageMissedCommissionAmount,
          userReports: cashbackSimulation,
          startDate: week.startDate,
          endDate: week.endDate,
        };

        console.log(`writing report for the date range: ${startDate} to ${endDate}`);
        // write report for this week
        fs.writeFileSync(
          path.join(__dirname, '.tmp', `UserCashBackReport_${startDate}-${endDate}.csv`),
          parse(weekReport.userReports),
        );

        return weekReport;
      }),
    );

    report.weekReports.forEach(async (week) => {
      // write summary report for this week
      fs.writeFileSync(
        path.join(
          __dirname,
          '.tmp',
          `WeekCashBackReportSummary_${dayjs(week.startDate).format('MM-DD-YYYY')}-${dayjs(week.endDate).format(
            'MM-DD-YYYY',
          )}.csv`,
        ),
        parse({
          startDate: dayjs(week.startDate).format('MM-DD-YYYY'),
          endDate: dayjs(week.endDate).format('MM-DD-YYYY'),
          totalMissedCashback: week.totalMissedCashback,
          totalMissedCashbackTransactions: week.totalMissedCashbackTransactions,
          averageCashbackMissedPerTransaction: week.averageCashbackMissedPerTransaction,
        }),
      );
    });

    report.totalMissedCashbackTransactions = report.weekReports.reduce(
      (acc, curr) => acc + curr.totalMissedCashbackTransactions,
      0,
    );
    report.totalMissedCashback = report.weekReports.reduce((acc, curr) => acc + curr.totalMissedCashback, 0);
    report.averageMissedCashback = report.totalMissedCashbackTransactions > 0
      ? roundToPercision(report.totalMissedCashback / report.totalMissedCashbackTransactions, 2)
      : 0;

    return report;
  } catch (error) {
    console.error(error);
    return {
      weekReports: [],
      totalMissedCashback: 0,
      totalMissedCashbackTransactions: 0,
      averageMissedCashback: 0,
    };
  }
};

const getPrevWeeksStartAndEndDates = (numberOfWeeks: number): { startDate: Date; endDate: Date }[] => {
  const prevWeeks: { startDate: Date; endDate: Date }[] = [];
  for (let i = 0; i < numberOfWeeks; i++) {
    prevWeeks.push({
      startDate: dayjs()
        .utc()
        .subtract(i + 1, 'week')
        .toDate(),
      endDate: dayjs().utc().subtract(i, 'week').toDate(),
    });
  }
  return prevWeeks;
};

export const generateCashbackAnalysisReport = async (weeksBack: number): Promise<CashbackAnalysisReport> => {
  if (weeksBack < 1) {
    throw new Error('weeksBack must be greater than 0');
  }
  /* - [ ] analysis going 4 weeks back */
  const prevWeeks = getPrevWeeksStartAndEndDates(8);
  console.log('preparing report for previous four weeks:', JSON.stringify(prevWeeks, null, 2));

  const report = await getPrevWeeksCashBackReport(prevWeeks);

  /* - [ ] Flag purchases over a certain amount */
  /* - [ ] check the past 30 and 60 days for any of these significant cashback missed opportunities (in a single transaction) . */

  // prepare summary report
  fs.writeFileSync(
    path.join(__dirname, '.tmp', `${weeksBack}WeekCashBackReportSummary_${dayjs().format('MM-DD-YYYY')}.csv`),
    parse({
      startDate: prevWeeks[0]?.startDate,
      endDate: prevWeeks[prevWeeks.length - 1]?.endDate,
      totalMissedCashback: report.totalMissedCashback,
      totalMissedCashbackTransactions: report.totalMissedCashbackTransactions,
      averageMissedCashback: report.averageMissedCashback,
    }),
  );

  return report;
};

type MissedCashbackMerchantFrequencyRequest = {
  startDate: Date;
  endDate: Date;
};

type MissedCashbackMerchantFrequencyReport = {
  userId: Types.ObjectId;
  merchantFrequencies: {
    company: string;
    frequency: number;
    amount: number;
  }[];
};
const getCashbackMerchantFrequencyMetricsForDateRange = async (
  user: IUserDocument,
  startDate?: Date,
  endDate?: Date,
): Promise<MissedCashbackMerchantFrequencyReport> => {
  const companies = await getCashbackCompanies(startDate, endDate, user._id);
  if (!companies?.length) {
    console.log(`no cashback  merchants found for user ${user._id} in the date range ${startDate} to ${endDate}`);
    return {
      userId: user._id.toString(),
      merchantFrequencies: [],
    };
  }
  console.log(`found ${companies.length} merchants for user ${user._id} in the date range ${startDate} to ${endDate}`);
  const merchantFrequencies = companies.map((company) => ({
    company: company.company,
    frequency: company.count,
    amount: roundToPercision(company.amount, 2),
  }));
  return {
    userId: user._id.toString(),
    merchantFrequencies,
  };
};

const genereateMissedCashbackMerchantFrequencyReport = async (
  req: UserIterationRequest<MissedCashbackMerchantFrequencyRequest>,
  userBatch: PaginateResult<IUser>,
): Promise<UserIterationResponse<MissedCashbackMerchantFrequencyReport>[]> => {
  // get all transactions for this user in the date range (with cashback merchants)
  // grouped by merchant
  // count the number of transactions for each merchant
  // get this data from an aggregate pipeline

  const cashbackMerchantFrequencyMetrics = (
    await Promise.all(
      userBatch?.docs?.map(async (user) => getCashbackMerchantFrequencyMetricsForDateRange(
        user as unknown as IUserDocument,
        req.fields?.startDate,
        req.fields?.endDate,
      )),
    )
  ).filter((metric) => metric?.merchantFrequencies?.length > 0);
  const userReports: UserIterationResponse<MissedCashbackMerchantFrequencyReport>[] = cashbackMerchantFrequencyMetrics?.map(
    (metric) => {
      const { userId, merchantFrequencies } = metric;
      return {
        userId,
        fields: {
          userId,
          merchantFrequencies,
        },
      };
    },
  );
  return userReports;
};

export const generateMissedCashbackMerchantFrequencyReport = async (weeksBack: number) => {
  if (weeksBack < 1) {
    throw new Error('weeksBack must be greater than 0');
  }
  let report: MissedCashbackMerchantFrequencyReport[] = [];

  const startDate = dayjs().utc().subtract(weeksBack, 'week').toDate();
  const endDate = dayjs().utc().toDate();

  const usersWithCommissionsInDateRange = await getUsersWithCommissionsInDateRange(startDate, endDate);
  const usersWithTransactionsInDateRange = await getUsersWithTransactionsInDateRange(startDate, endDate);

  const msDelayBetweenBatches = 2000;

  const request: UserIterationRequest<MissedCashbackMerchantFrequencyRequest> = {
    batchQuery: {
      $and: [{ _id: { $nin: usersWithCommissionsInDateRange } }, { _id: { $in: usersWithTransactionsInDateRange } }],
    },
    batchLimit: 100,
    fields: {
      startDate,
      endDate,
    },
  };

  report = (
    await iterateOverUsersAndExecWithDelay(
      request,
      genereateMissedCashbackMerchantFrequencyReport,
      msDelayBetweenBatches,
    )
  ).map((res) => res?.fields);

  const reportFileName = `MissedCashbackMerchantFrequencyReport_${
    !!request.fields?.startDate ? dayjs(request.fields.startDate).format('MM-DD-YYYY') : ''
  }_${!!request.fields?.endDate ? `->${dayjs(request.fields.endDate).format('MM-DD-YYYY')}` : ''}${dayjs().format(
    'MM-DD-YYYY',
  )}.csv`;
  fs.writeFileSync(path.join(__dirname, '.tmp', reportFileName), parse(report));

  // run top level stats calculations
  type MerchantFrequencySummaryReport = {
    company: string;
    frequency: number;
    amount: number;
  };

  const merchantFrequencySummaryReport: MerchantFrequencySummaryReport[] = (
    await getCashbackCompanies(request.fields?.startDate, request.fields?.endDate)
  )?.map((company) => ({
    company: company.company,
    amount: roundToPercision(company.amount, 2),
    frequency: company.count,
  }));
  const summaryFileName = `MissedCashbackMerchantFrequencySummary_${
    !!request.fields?.startDate ? dayjs(request.fields.startDate).format('MM-DD-YYYY') : ''
  }_${!!request.fields?.endDate ? `->${dayjs(request.fields.endDate).format('MM-DD-YYYY')}` : ''}${dayjs().format(
    'MM-DD-YYYY',
  )}.csv`;
  fs.writeFileSync(path.join(__dirname, '.tmp', summaryFileName), parse(merchantFrequencySummaryReport));

  return report;
};
