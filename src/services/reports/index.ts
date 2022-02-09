import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { ErrorTypes } from '../../lib/constants';
import CustomError, { asCustomError } from '../../lib/customError';
import { CardModel } from '../../models/card';
import { TransactionModel } from '../../models/transaction';
import { UserModel } from '../../models/user';
import { IChartData } from '../../types/chart';
import { IRequest } from '../../types/request';

dayjs.extend(utc);

export enum ReportType {
  UserSignup = 'user-signup',
}

export interface IReportParams {
  reportId: ReportType;
}

export const getUserSignUpsReport = async (req: IRequest<IReportParams, { daysInPast: string }>): Promise<IChartData> => {
  const MAX_ALLOWED_DAYS_IN_PAST = 365;
  try {
    const { daysInPast = '30' } = req.query;
    let _daysInPast = parseInt(daysInPast);

    // if is an invalid number of days, do not throw
    // error, just default back to 30 days.
    if (Number.isNaN(_daysInPast)) _daysInPast = 30;

    // if the number of days is greater than
    // MAX_ALLOWED_DAYS_IN_PAST, limit days in past
    // to MAX_ALLOWED_DAYS_IN_PAST instead.
    if (_daysInPast > MAX_ALLOWED_DAYS_IN_PAST) _daysInPast = MAX_ALLOWED_DAYS_IN_PAST;

    const thresholdDate = dayjs(dayjs().utc().format('MMM DD, YYYY'))
      .utc()
      .subtract(_daysInPast, 'days');

    const aggData: { _id: string, count: number}[] = await UserModel.aggregate()
      .match({ dateJoined: { $gte: thresholdDate.toDate() } })
      .project({ day: { $substr: ['$dateJoined', 0, 10] } })
      .group({ _id: '$day', count: { $sum: 1 } })
      .sort({ _id: 1 });

    const data = aggData.map(d => ({
      label: d._id,
      values: [{ value: d.count }],
    }));

    // TODO: iterate through all data and add in any
    // dates within this range that were skipped

    return { data };
  } catch (err) {
    throw asCustomError(err);
  }
};

export const getReport = async (req:IRequest<IReportParams, any>): Promise<IChartData> => {
  switch (req.params.reportId) {
    case ReportType.UserSignup: return getUserSignUpsReport(req);
    default: throw new CustomError('Invalid report id found.', ErrorTypes.INVALID_ARG);
  }
};

export const getAllReports = async (_: IRequest) => {
  console.log('>>>>> getting all reports');

  return [
    {
      // TODO: figure out if this is needed. if not going to be
      // stored in db, then will not be needed and should be
      // removed...
      //
      // ...if removed, then we need to make sure there are no
      // duplicate slugs included in any of the reports so
      // they can be uniquely identified.
      _id: 'abc123',
      // a unique key for FE and BE to identify this report by.
      // this shuld not change once set
      reportId: 'user-signups',
      name: 'User Signups',
      description: 'A breakdown of user signups per day.',
      // TODO: figure out if this is needed. if we want to store
      // these reports in db, then it will need to be...if we are
      // going to generate them at request time, it will not be
      lastUpdated: dayjs().utc().toDate(),
    },
    {
      // TODO: figure out if this is needed. if not going to be
      // stored in db, then will not be needed and should be
      // removed...
      //
      // ...if removed, then we need to make sure there are no
      // duplicate slugs included in any of the reports so
      // they can be uniquely identified.
      _id: 'def456',
      // a unique key for FE and BE to identify this report by.
      // this shuld not change once set
      reportId: 'carbon-offsets',
      name: 'Carbon Offsets',
      description: 'A breakdown of user carbon offset purchases per day.',
      // TODO: figure out if this is needed. if we want to store
      // these reports in db, then it will need to be...if we are
      // going to generate them at request time, it will not be
      lastUpdated: dayjs().utc().toDate(),
    },
  ];
};

export const getSummary = async (_: IRequest) => {
  try {
    const totalUsersCount = await UserModel.find({}).count();
    const cards = await CardModel.find({});
    const transactions = await TransactionModel.find({}).count();
    const usersWithCards = new Set();

    for (const card of cards) {
      if (!usersWithCards.has(card.userId.toString())) {
        usersWithCards.add(card.userId.toString());
      }
    }

    return {
      users: {
        total: totalUsersCount,
        withCard: usersWithCards.size,
        withoutCard: totalUsersCount - usersWithCards.size,
      },
      cards: {
        total: cards.length,
      },
      transactions: {
        total: transactions,
      },
    };
  } catch (err) {
    throw asCustomError(err);
  }
};
