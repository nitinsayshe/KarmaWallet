import { SandboxedJob } from 'bullmq';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { JobNames, UserReportTypes } from '../lib/constants/jobScheduler';
import { asCustomError } from '../lib/customError';
import { CardModel } from '../models/card';
import { ReportModel } from '../models/report';
import { UserModel } from '../models/user';

dayjs.extend(utc);

/**
 * jobs to run every two hors to generate a new user reports
 */

interface IJobData {
  reportType: UserReportTypes;
}
const MaxDaysBack = 200;

const generateUserMetricsReport = async (daysBack: number) => {
  if (daysBack <= 0 || daysBack > MaxDaysBack) {
    throw new Error('Invalid days back value');
  }

  const thresholdDate = dayjs()
    .utc()
    .subtract(daysBack, 'days');

  const totalUsersBeforeThreshold = await UserModel.countDocuments({
    dateJoined: { $lt: thresholdDate.endOf('day').toDate() },
  });

  // get user data
  let userAggData = await UserModel.aggregate()
    .match({
      dateJoined: { $gte: thresholdDate.endOf('day').toDate() },
    })
    .project({
      dateJoinedDate: { $substr: ['$dateJoined', 0, 10] },
      dateJoined: '$dateJoined',
    })
    .group({
      _id: '$dateJoinedDate',
      count: { $sum: 1 },
      dateJoined: { $first: '$dateJoined' },
    })
    .sort({ dateJoined: 1 });

  // aggregate count
  let cumulator = totalUsersBeforeThreshold;
  userAggData = userAggData.map((d) => {
    cumulator += d.count;
    d.count = cumulator;
    return d;
  });

  if (!userAggData || !userAggData.length || userAggData.length === 0) {
    throw new Error('No user data found');
  }

  const data: {label: string, values: { value: string }[]}[] = await Promise.all(
    userAggData.map(async (userData, i) => {
      const day = dayjs(new Date(userData.dateJoined)).utc();
      const label = i === userAggData.length - 1
        ? dayjs.utc().format('MMM DD, YYYY') : day.endOf('day').format('MMM DD, YYYY');

      let usersWithCardsByDate: any[] | {userId: number}[] = await CardModel.aggregate()
        .match({
          createdOn: {
            $lte: day.endOf('day').toDate(),
          },
        })
        .group({
          _id: '$userId',
          userId: { $first: '$userId' },
        })
        .count('userId');
      usersWithCardsByDate = !!usersWithCardsByDate
      && usersWithCardsByDate.length > 0
      && !!usersWithCardsByDate[0].userId
        ? usersWithCardsByDate[0].userId : 0;

      return {
        label,
        values: [
          { value: userData.count },
          { value: usersWithCardsByDate },
        ],
      };
    }),
  );

  // store this report
  await ReportModel.create({ userMetrics: { data } });
};

const generateUserHistoryReport = async () => {
  // get user data
  let userAggData = await UserModel.aggregate()
    .project({
      dateJoinedDate: { $substr: ['$dateJoined', 0, 7] },
      dateJoined: '$dateJoined',
    })
    .group({
      _id: '$dateJoinedDate',
      count: { $sum: 1 },
      dateJoined: { $first: '$dateJoined' },
    })
    .sort({ dateJoined: 1 });

  // aggregate count
  let cumulator = 0;
  userAggData = userAggData.map((d) => {
    cumulator += d.count;
    d.count = cumulator;
    return d;
  });

  if (!userAggData || !userAggData.length || userAggData.length === 0) {
    throw new Error('No user data found');
  }

  const data: {label: string, values: { value: string }[]}[] = await Promise.all(
    userAggData.map(async (userData, i) => {
      const day = dayjs(new Date(userData.dateJoined)).utc();
      const label = (i === userAggData.length - 1)
        ? dayjs.utc().format('MM-DD-YY') : day.endOf('month').format('MM-DD-YY');

      let usersWithCardsByDate: any[] | {userId: number}[] = await CardModel.aggregate()
        .match({
          createdOn: {
            $lte: day.endOf('month').toDate(),
          },
        })
        .group({
          _id: '$userId',
          userId: { $first: '$userId' },
        })
        .count('userId');

      usersWithCardsByDate = !!usersWithCardsByDate
        && usersWithCardsByDate.length > 0
        && !!usersWithCardsByDate[0].userId
        ? usersWithCardsByDate[0].userId : 0;

      return {
        label,
        values: [
          { value: userData.count },
          { value: usersWithCardsByDate },
        ],
      };
    }),
  );

  // store this report
  await ReportModel.create({ userHistory: { data } });
};

export const exec = async (data?: IJobData) => {
  try {
    switch (data.reportType) {
      case UserReportTypes.Historical:
        return await generateUserHistoryReport();
      case UserReportTypes.ThirtyDays:
        return await generateUserMetricsReport(30);
      default:
        throw new Error('Invalid report type');
    }
  } catch (err) {
    throw asCustomError(err);
  }
};

export const onComplete = () => {
  console.log(`${JobNames.GenerateUserReport} finished`);
};

export const onFailed = (_: SandboxedJob, err: Error) => {
  console.log(`${JobNames.GenerateUserReport} failed`);
  console.log(err);
};
