import dayjs from 'dayjs';
import { parse } from 'json2csv';
import fs from 'fs';
import { PaginateResult, Types } from 'mongoose';
import path from 'path';
import { SafeParseError, z } from 'zod';
import { SyncRequest } from '../../jobs/syncActiveCampaign';
import { roundToPercision, sleep } from '../../lib/misc';
import { getMissedCashBackForDateRange, getUsersWithTransactionsInDateRange } from '../../lib/userMetrics';
import { IUser, IUserDocument, UserModel } from '../../models/user';

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
  req: SyncRequest<RangedCashbackSimulationFields>,
  userBatch: PaginateResult<IUser>,
): Promise<CashbackUserReport[]> => {
  let missedCashbackMetrics = await Promise.all(
    userBatch?.docs?.map(async (user) => getMissedCashBackForDateRange(user as unknown as IUserDocument, req.fields?.startDate, req.fields?.endDate)),
  );
  const emailSchema = z.string().email();
  missedCashbackMetrics = missedCashbackMetrics?.filter((metric) => {
    const validationResult = emailSchema.safeParse(metric.email);
    return !!metric.email && !(validationResult as SafeParseError<string>)?.error;
  });

  const userReports: CashbackUserReport[] = missedCashbackMetrics?.map((metric) => {
    const {
      id,
      estimatedMissedCommissionsAmount,
      estimatedMissedCommissionsCount,
      averageMissedCommissionAmount,
      largestMissedCommissionAmount,
    } = metric;
    return {
      userId: id,
      totalMissedCashback: roundToPercision(estimatedMissedCommissionsAmount, 0),
      totalMissedCashbackTransactions: estimatedMissedCommissionsCount,
      averageCashbackMissedPerTransaction: roundToPercision(averageMissedCommissionAmount, 0),
      largestMissedCashbackTransactionAmount: roundToPercision(largestMissedCommissionAmount, 0),
    };
  });

  return userReports;
};
const iterateOverUsersAndExecWithDelay = async <T>(
  request: SyncRequest<T>,
  exec: (req: SyncRequest<T>, userBatch: PaginateResult<IUser>) => Promise<CashbackUserReport[]>,
  msDelayBetweenBatches: number,
): Promise<CashbackUserReport[]> => {
  let report: CashbackUserReport[] = [];

  let page = 1;
  let hasNextPage = true;
  while (hasNextPage) {
    const userBatch = await UserModel.paginate(request.batchQuery, {
      page,
      limit: request.batchLimit,
    });

    console.log('total users matching query: ', userBatch.totalDocs);
    const userReports = await exec(request, userBatch);

    console.log(`Prepared ${userReports.length} user reports`);
    report = report.concat(userReports);

    sleep(msDelayBetweenBatches);

    hasNextPage = userBatch?.hasNextPage || false;
    page++;
  }
  return report;
};

const runCashbackSimulation = async (startDate: Date, endDate: Date): Promise<CashbackUserReport[]> => {
  const usersWithTransactionsInDateRange = await getUsersWithTransactionsInDateRange(startDate, endDate);
  const msDelayBetweenBatches = 2000;

  const request: SyncRequest<RangedCashbackSimulationFields> = {
    batchQuery: { _id: { $in: usersWithTransactionsInDateRange } },
    batchLimit: 100,
    fields: {
      startDate,
      endDate,
    },
  };
  return iterateOverUsersAndExecWithDelay(request, runUserCashbackSimulation, msDelayBetweenBatches);
};

const getPrevWeeksCashBackReport = async (
  prevFourWeeks: { startDate: Date; endDate: Date }[],
): Promise<CashbackAnalysisReport> => {
  try {
    const report: CashbackAnalysisReport = {
      weekReports: [],
      totalMissedCashback: 0,
      averageMissedCashback: 0,
      totalMissedCashbackTransactions: 0,
    };
    report.weekReports = await Promise.all(
      prevFourWeeks.map(async (week) => {
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
export const generateCashbackAnalysisReport = async (): Promise<CashbackAnalysisReport> => {
  /* - [ ] analysis going 4 weeks back */
  const prevWeeks = [
    {
      startDate: dayjs().utc().subtract(4, 'week').toDate(),
      endDate: dayjs().utc().subtract(3, 'week').toDate(),
    },
    {
      startDate: dayjs().utc().subtract(3, 'week').toDate(),
      endDate: dayjs().utc().subtract(2, 'week').toDate(),
    },
    {
      startDate: dayjs().utc().subtract(2, 'week').toDate(),
      endDate: dayjs().utc().subtract(1, 'week').toDate(),
    },
    {
      startDate: dayjs().utc().subtract(1, 'week').toDate(),
      endDate: dayjs().utc().toDate(),
    },
  ];
  console.log('preparing report for previous four weeks:', JSON.stringify(prevWeeks, null, 2));

  const report = await getPrevWeeksCashBackReport(prevWeeks);

  /* - [ ] Flag purchases over a certain amount */
  /* - [ ] check the past 30 and 60 days for any of these significant cashback missed opportunities (in a single transaction) . */

  // prepare summary report
  fs.writeFileSync(
    path.join(__dirname, '.tmp', `FourWeekCashBackReportSummary_${dayjs().format('MM-DD-YYYY')}.csv`),
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
