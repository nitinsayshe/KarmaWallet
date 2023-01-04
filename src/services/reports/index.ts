import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { ErrorTypes } from '../../lib/constants';
import CustomError, { asCustomError } from '../../lib/customError';
import { ReportModel } from '../../models/report';
import { IChart } from '../../types/chart';
import { IRequest } from '../../types/request';
import { getCarbonOffsetsReport } from './carbonOffsets';
import { getCardsAddedReport } from './cardsAdded';
import { getCardsAddedHistoryReport } from './cardsAddedHistory';
import { getTransactionsMonitorReport } from './transactionMonitor';
import { getUserReport } from './user';
import { getLoginReport } from './userLogins';
import { getUserSignUpsReport } from './userSignups';
import { IReportRequestParams, ReportType } from './utils/types';

dayjs.extend(utc);

export const getReport = async (req:IRequest<IReportRequestParams, any>): Promise<IChart> => {
  switch (req.params.reportId) {
    case ReportType.CardsAdded: return getCardsAddedReport(req);
    case ReportType.CardsAddedHistory: return getCardsAddedHistoryReport();
    case ReportType.CarbonOffsets: return getCarbonOffsetsReport(req);
    case ReportType.TransactionMonitor: return getTransactionsMonitorReport(req);
    case ReportType.UserSignup: return getUserSignUpsReport(req);
    case ReportType.User: return getUserReport(req);
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
      description: 'A cumulative view of cards added to the platform over the past thirty days.',
      lastUpdated: dayjs().utc().toDate(),
    },
    {
      reportId: ReportType.CardsAddedHistory,
      name: 'Cards Added History',
      description: 'A cumulative view of cards added to the platform.',
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
      description: 'A cumulative view user signups per day.',
      lastUpdated: dayjs().utc().toDate(),
    },
    {
      // a unique key for FE and BE to identify this report by.
      // this shuld not change once set
      reportId: ReportType.User,
      name: 'User Metrics',
      description: 'User signups and cards added to the platform over the past thirty days.',
      lastUpdated: dayjs().utc().toDate(),
    },
    {
      reportId: ReportType.UserLoginsThirtyDays,
      name: 'Logins: 30 Days',
      description: 'Daily login counts over the past thirty days.',
      lastUpdated: dayjs().utc().toDate(),
    },
    {
      reportId: ReportType.UserLoginsSevenDays,
      name: 'Logins: 7 Days',
      description: 'Daily login counts over the past seven days.',
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
    const report = await ReportModel.findOne({
      $and: [
        { adminSummary: { $exists: true } },
        { adminSummary: { $ne: null } },
      ],
    }).sort({ createdOn: -1 });

    if (!report) {
      throw new CustomError('No report found.', ErrorTypes.NOT_FOUND);
    }

    return report.adminSummary;
  } catch (err) {
    throw asCustomError(err);
  }
};
