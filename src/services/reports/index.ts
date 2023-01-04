import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { ObjectId } from 'mongoose';
import { ErrorTypes } from '../../lib/constants';
import { sectorsToExcludeFromTransactions } from '../../lib/constants/transaction';
import CustomError, { asCustomError } from '../../lib/customError';
import { CardModel } from '../../models/card';
import { CommissionModel } from '../../models/commissions';
import { ReportModel } from '../../models/report';
import { TransactionModel } from '../../models/transaction';
import { UserModel } from '../../models/user';
import { UserLogModel } from '../../models/userLog';
import { IChart } from '../../types/chart';
import { IRequest } from '../../types/request';
import { getCarbonOffsetsReport } from './carbonOffsets';
import { getCardsAddedReport } from './cardsAdded';
import { getTransactionsMonitorReport } from './transactionMonitor';
import { getLoginReport } from './userLogins';
import { getUserSignUpsReport } from './userSignups';
import { IReportRequestParams, ReportType } from './utils/types';

dayjs.extend(utc);

export const getReport = async (req:IRequest<IReportRequestParams, any>): Promise<IChart> => {
  switch (req.params.reportId) {
    case ReportType.CardsAdded: return getCardsAddedReport(req);
    case ReportType.CarbonOffsets: return getCarbonOffsetsReport(req);
    case ReportType.TransactionMonitor: return getTransactionsMonitorReport(req);
    case ReportType.UserSignup: return getUserSignUpsReport(req);
    case ReportType.UserLoginsSevenDays: return getLoginReport(req, 7);
    case ReportType.UserLoginsThirtyDays: return getLoginReport(req, 30);
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
    {
      reportId: ReportType.UserLoginsThirtyDays,
      name: 'Total Logins - 30 Days',
      description: 'Total logins over the past thirty days.',
      lastUpdated: dayjs().utc().toDate(),
    },
    {
      reportId: ReportType.UserLoginsSevenDays,
      name: 'Total Logins - 7 Days',
      description: 'Total logins over the past seven days.',
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

    let totalOffsets: {dollars: number, tonnes: number}[] = await TransactionModel.aggregate()
      .match({
        $and: [
          { sector: { $nin: sectorsToExcludeFromTransactions } },
          { amount: { $gt: 0 } },
          { reversed: { $ne: true } },
          { 'integrations.rare': { $ne: null } },
        ],

      })
      .group({
        _id: null,
        tonnes: { $sum: '$integrations.rare.tonnes_amt' },
        dollars: { $sum: '$integrations.rare.subtotal_amt' },
      });
    if (!totalOffsets || totalOffsets.length === 0) {
      totalOffsets = [{ dollars: 0, tonnes: 0 }];
    }

    let totalCommissions = 0;
    const commissions = await CommissionModel.find({}).lean();
    if (!!commissions && commissions.length > 0) {
      totalCommissions = commissions.reduce(
        (partialSum, commission) => partialSum + commission.amount,
        0,
      );
    }

    /* const loggedInLastSevenDays = await UserLogModel.find({ date: { $gte: dayjs().subtract(7, 'days').utc().toDate() } }).lean(); */
    const loggedInLastSevenDays = await UserLogModel.aggregate([
      { $match: { date: { $gte: dayjs().subtract(7, 'days').utc().toDate() } } },
      { $group: { _id: '$userId' } },
    ]);

    const loggedInLastThirtyDays = await UserLogModel.aggregate([
      { $match: { date: { $gte: dayjs().subtract(30, 'days').utc().toDate() } } },
      { $group: { _id: '$userId' } },
    ]);

    const totalLoginsLastSevenDays = await UserLogModel.find({ date: { $gte: dayjs().subtract(7, 'days').utc().toDate() } }).count();
    const totalLoginsLastThirtyDays = await UserLogModel.find({ date: { $gte: dayjs().subtract(30, 'days').utc().toDate() } }).count();

    return {
      users: {
        total: totalUsersCount,
        withCard: usersWithCards.size,
        withoutCard: totalUsersCount - usersWithCards.size,
        loggedInLastSevenDays: loggedInLastSevenDays ? loggedInLastSevenDays.length : 0,
        loggedInLastThirtyDays: loggedInLastThirtyDays ? loggedInLastThirtyDays.length : 0,
        totalLoginsLastSevenDays,
        totalLoginsLastThirtyDays,
      },
      cards: {
        total: cards.length,
      },
      transactions: {
        total: transactions,
      },
      totalOffsets: {
        dollars: (totalOffsets[0].dollars / 100).toFixed(0),
        tons: totalOffsets[0]?.tonnes.toFixed(0),
      },
      totalCommissionsEarned: {
        total: totalCommissions,
      },
    };
  } catch (err) {
    throw asCustomError(err);
  }
};
