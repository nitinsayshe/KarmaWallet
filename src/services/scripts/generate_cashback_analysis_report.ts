import dayjs from 'dayjs';
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
  averageMissedCashback: number;
  averageCashbackMissedPerTransaction: number;
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

const getFourWeekCashBackReport = async (
  prevFourWeeks: { startDate: Date; endDate: Date }[],
): Promise<CashbackAnalysisReport> => {
  try {
    const report: CashbackAnalysisReport = {
      weekReports: [],
      averageMissedCashback: 0,
      averageCashbackMissedPerTransaction: 0,
    };
    report.weekReports = await Promise.all(
      prevFourWeeks.map(async (week) => {
        // run cashback simulation on all users for this week
        const cashbackSimulation = await runCashbackSimulation(week.startDate, week.endDate);
        // sum up the total missed cashback for this week
        // average the missed cashback per transaction for this week

        return {
          totalMissedCashback: 0,
          totalMissedCashbackTransactions: 0,
          averageCashbackMissedPerTransaction: 0,
          userReports: cashbackSimulation,
          startDate: week.startDate,
          endDate: week.endDate,
        };
      }),
    );

    return report;
  } catch (error) {
    console.error(error);
    return {
      weekReports: [],
      averageMissedCashback: 0,
      averageCashbackMissedPerTransaction: 0,
    };
  }
};
export const generateCashbackAnalysisReport = async (): Promise<CashbackAnalysisReport> => {
  /* - [ ] analysis going 4 weeks back */
  const prevFourWeeks = [
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

  const report = getFourWeekCashBackReport(prevFourWeeks);
  // calculate the average cashback missed per transaction
  // calculate the average cashback missed per week
  //
  /* - [ ] For each week, how much missed cashback was there overall? */
  /* - [ ] use this data to set a minimum threshold for notifying the user that they could earn cash back */
  /* - [ ] Flag purchases over a certain amount */
  /* - [ ] check the past 30 and 60 days for any of these significant cashback missed opportunities (in a single transaction) . */

  fs.writeFileSync(
    path.join(__dirname, '.tmp', `FourWeekCashBackReport_${dayjs().format('MM-DD-YYYY')}.csv`),
    JSON.stringify(report.weekReports),
  );

  return report;
};
