import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { ErrorTypes } from '../../lib/constants';
import CustomError, { asCustomError } from '../../lib/customError';
import { CardModel } from '../../models/card';
import { TransactionModel } from '../../models/transaction';
import { UserModel } from '../../models/user';
import { IChartData } from '../../types/chart';
import { IRequest } from '../../types/request';
import { getDaysInPast } from './utils';

dayjs.extend(utc);

export enum ReportType {
  UserSignup = 'user-signups',
  CarbonOffsets = 'carbon-offsets',
  CardsAdded = 'cards-added',
}

export interface IReportRequestParams {
  reportId: ReportType;
}

export interface IReportRequestQuery {
  daysInPast: string;
}

export const getCarbonOffsetsReport = async (req: IRequest<IReportRequestParams, IReportRequestQuery>): Promise<IChartData> => {
  try {
    const _daysInPast = getDaysInPast(req.query.daysInPast || '30', 365);
    const thresholdDate = dayjs(dayjs().utc().format('MMM DD, YYYY'))
      .utc()
      .subtract(_daysInPast, 'days');

    const offsetsPurchasedBeforeThreshold = await TransactionModel.find({
      date: { $lt: thresholdDate.toDate() },
      'integrations.rare': { $exists: true },
    }).count();
    let aggData = await TransactionModel.aggregate()
      .match({
        date: { $gte: thresholdDate.toDate() },
        'integrations.rare': { $exists: true },
      })
      .project({ day: { $substr: ['$date', 0, 10] } })
      .group({ _id: '$day', count: { $sum: 1 } })
      .sort({ _id: 1 });

    let cumulator = offsetsPurchasedBeforeThreshold;
    aggData = aggData.map(d => {
      cumulator += d.count;
      d.count = cumulator;
      return d;
    });

    const data = aggData.map(d => {
      const [_, month, date] = d._id.split('-');
      const day = dayjs(`${month} ${date}`);
      return {
        label: day.format('MMM DD'),
        values: [{ value: d.count }],
      };
    });

    // TODO: iterate through all data and add in any
    // dates within this range that were skipped

    return { data };
  } catch (err) {
    throw asCustomError(err);
  }
};

export const getCardsAddedReport = async (req: IRequest<IReportRequestParams, IReportRequestQuery>) => {
  try {
    const _daysInPast = getDaysInPast(req.query.daysInPast || '30', 365);
    const thresholdDate = dayjs(dayjs().utc().format('MMM DD, YYYY'))
      .utc()
      .subtract(_daysInPast, 'days');

    const totalCardsCreatedBeforeThreshold = await CardModel.find({ dateJoined: { $lt: thresholdDate.toDate() } }).count();
    let aggData = await CardModel.aggregate()
      .match({ createdOn: { $gte: thresholdDate.toDate() } })
      .project({ day: { $substr: ['$createdOn', 0, 10] } })
      .group({ _id: '$day', count: { $sum: 1 } })
      .sort({ _id: 1 });

    let cumulator = totalCardsCreatedBeforeThreshold;
    aggData = aggData.map(d => {
      cumulator += d.count;
      d.count = cumulator;
      return d;
    });

    const data = aggData.map(d => {
      const [_, month, date] = d._id.split('-');
      const day = dayjs(`${month} ${date}`);
      return {
        label: day.format('MMM DD'),
        values: [{ value: d.count }],
      };
    });

    console.log('>>>>> data', data);

    // TODO: iterate through all data and add in any
    // dates within this range that were skipped

    return { data };
  } catch (err) {
    throw asCustomError(err);
  }
};

export const getUserSignUpsReport = async (req: IRequest<IReportRequestParams, IReportRequestQuery>): Promise<IChartData> => {
  try {
    const _daysInPast = getDaysInPast(req.query.daysInPast || '30', 365);

    const thresholdDate = dayjs(dayjs().utc().format('MMM DD, YYYY'))
      .utc()
      .subtract(_daysInPast, 'days');

    const totalUsersBeforeThreshold = await UserModel.find({ dateJoined: { $lt: thresholdDate.toDate() } }).count();
    let aggData: { _id: string, count: number}[] = await UserModel.aggregate()
      .match({ dateJoined: { $gte: thresholdDate.toDate() } })
      .project({ day: { $substr: ['$dateJoined', 0, 10] } })
      .group({ _id: '$day', count: { $sum: 1 } })
      .sort({ _id: 1 });

    let cumulator = totalUsersBeforeThreshold;
    aggData = aggData.map(d => {
      cumulator += d.count;
      d.count = cumulator;
      return d;
    });

    const data = aggData.map(d => {
      const [_, month, date] = d._id.split('-');
      const day = dayjs(`${month} ${date}`);
      return {
        label: day.format('MMM DD'),
        values: [{ value: d.count }],
      };
    });

    // TODO: iterate through all data and add in any
    // dates within this range that were skipped

    return { data };
  } catch (err) {
    throw asCustomError(err);
  }
};

export const getReport = async (req:IRequest<IReportRequestParams, any>): Promise<IChartData> => {
  switch (req.params.reportId) {
    case ReportType.UserSignup: return getUserSignUpsReport(req);
    case ReportType.CarbonOffsets: return getCarbonOffsetsReport(req);
    case ReportType.CardsAdded: return getCardsAddedReport(req);
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
      reportId: ReportType.UserSignup,
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
      reportId: ReportType.CarbonOffsets,
      name: 'Carbon Offsets',
      description: 'A breakdown of user carbon offset purchases per day.',
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
      _id: 'ghi789',
      // a unique key for FE and BE to identify this report by.
      // this shuld not change once set
      reportId: ReportType.CardsAdded,
      name: 'Cards Added',
      description: 'A breakdown of the number of cards being added per day.',
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
      if (!card.userId) {
        // TODO: remove this once new linked cards are created with the new user id.
        console.log(card);
      } else {
        if (!usersWithCards.has(card.userId.toString())) {
          usersWithCards.add(card.userId.toString());
        }
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
