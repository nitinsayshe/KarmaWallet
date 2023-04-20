import dayjs from 'dayjs';
import path from 'path';
import fs from 'fs';

type CashbackUserReport = {
  userId: string;
  totalMissedCashback: number;
  totalMissedCashbackTransactions: number;
  averageCashbackMissedPerTransaction: number;
  largestMissedCashbackTransaction: number;
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

const getFourWeekCashBackReport = (prevFourWeeks: { startDate: Date; endDate: Date }[]): CashbackAnalysisReport => {
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
