import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { ObjectId } from 'mongoose';
import { ErrorTypes } from '../../lib/constants';
import CustomError, { asCustomError } from '../../lib/customError';
import { CardModel } from '../../models/card';
import { ReportModel } from '../../models/report';
import { TransactionModel } from '../../models/transaction';
import { UserModel } from '../../models/user';
import { IChart } from '../../types/chart';
import { IRequest } from '../../types/request';
import { getCarbonOffsetsReport } from './carbonOffsets';
import { getCardsAddedReport } from './cardsAdded';
import { getTransactionsMonitorReport } from './transactionMonitor';
import { getUserSignUpsReport } from './userSignups';
import { IReportRequestParams, ReportType } from './utils/types';

dayjs.extend(utc);

export const getReport = async (req:IRequest<IReportRequestParams, any>): Promise<IChart> => {
  switch (req.params.reportId) {
    case ReportType.CardsAdded: return getCardsAddedReport(req);
    case ReportType.CarbonOffsets: return getCarbonOffsetsReport(req);
    case ReportType.TransactionMonitor: return getTransactionsMonitorReport(req);
    case ReportType.UserSignup: return getUserSignUpsReport(req);
    default: throw new CustomError('Invalid report id found.', ErrorTypes.INVALID_ARG);
  }
};

export const getAllReports = async (_: IRequest) => {
  // TODO: figure out way to get latest of each individual report
  // so can get all reports last updated status in one request
  const latestTransactionMonitor = await ReportModel
    .findOne({ transactionMonitor: { $exists: true } })
    .sort({ createdOn: -1 });

  const reports = [
    {
      // a unique key for FE and BE to identify this report by.
      // this shuld not change once set
      reportId: ReportType.CardsAdded,
      name: 'Cards Added',
      description: 'A breakdown of the number of cards being added per day.',
      lastUpdated: dayjs().utc().toDate(),
    },
    {
      // a unique key for FE and BE to identify this report by.
      // this shuld not change once set
      reportId: ReportType.CarbonOffsets,
      name: 'Carbon Offsets',
      description: 'A breakdown of user carbon offset purchases per day.',
      lastUpdated: dayjs().utc().toDate(),
    },
    {
      // a unique key for FE and BE to identify this report by.
      // this shuld not change once set
      reportId: ReportType.UserSignup,
      name: 'User Signups',
      description: 'A breakdown of user signups per day.',
      lastUpdated: dayjs().utc().toDate(),
    },
  ];

  if (!!latestTransactionMonitor) {
    reports.push({
      // a unique key for FE and BE to identify this report by.
      // this shuld not change once set
      reportId: ReportType.TransactionMonitor,
      name: 'Transactions Monitor',
      description: 'A report of transactions state used for monitoring bugs in transaction mappings.',
      lastUpdated: latestTransactionMonitor.createdOn,
    });
  }

  return reports;
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
        const leanCard = await CardModel.findOne({ _id: card._id }).lean();
        const user = await UserModel.findOne({ legacyId: leanCard.userId });
        card.userId = user._id as unknown as ObjectId;
        await card.save();
      }

      if (!usersWithCards.has(card.userId.toString())) {
        usersWithCards.add(card.userId.toString());
      }
    }

    const totalOffsets = await ReportModel
      .findOne({ totalOffsetsForAllUsers: { $exists: true } })
      .sort({ createdOn: -1 })
      .lean();

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
      totalOffsets: {
        dollars: totalOffsets.totalOffsetsForAllUsers.dollars,
        tons: totalOffsets.totalOffsetsForAllUsers.tons,
      },
    };
  } catch (err) {
    throw asCustomError(err);
  }
};
