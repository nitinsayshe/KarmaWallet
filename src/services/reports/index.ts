import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { ErrorTypes } from '../../lib/constants';
import CustomError, { asCustomError } from '../../lib/customError';
import { ReportModel } from '../../models/report';
import { IChart } from '../../types/chart';
import { IRequest } from '../../types/request';
import { getAccountTypesReport } from './accountTypes';
import { getCarbonOffsetsReport } from './carbonOffsets';
import { getAccountsAddedReport } from './accountsAdded';
import { getAccountsAddedHistoryReport } from './accountsAddedHistory';
import { getUserReport } from './user';
import { getUserHistoryReport } from './userHistory';
import { getLoginReport } from './userLogins';
import { getUserSignUpsReport } from './userSignups';
import { IReportRequestParams, ReportType } from './utils/types';

dayjs.extend(utc);

export const getReport = async (req:IRequest<IReportRequestParams, any>): Promise<IChart> => {
  switch (req.params.reportId) {
    case ReportType.AccountsAdded: return getAccountsAddedReport(req);
    case ReportType.AccountsAddedHistory: return getAccountsAddedHistoryReport();
    case ReportType.CarbonOffsets: return getCarbonOffsetsReport(req);
    case ReportType.AccountTypes: return getAccountTypesReport(req);
    case ReportType.UserSignup: return getUserSignUpsReport(req);
    case ReportType.User: return getUserReport(req);
    case ReportType.UserHistory: return getUserHistoryReport(req);
    case ReportType.UserLoginsSevenDays: return getLoginReport(req, 7);
    case ReportType.UserLoginsThirtyDays: return getLoginReport(req, 30);
    case ReportType.CumulativeUserLoginsSevenDays: return getLoginReport(req, 7, true);
    case ReportType.CumulativeUserLoginThirtyDays: return getLoginReport(req, 30, true);
    default: throw new CustomError('Invalid report id found.', ErrorTypes.INVALID_ARG);
  }
};

export const getAllReports = async (_: IRequest) => {
  // TODO: figure out way to get latest of each individual report
  // so can get all reports last updated status in one request

  const userHistoryReportLastUpdatedDate = await ReportModel.findOne({
    $and: [
      { userHistory: { $exists: true } },
      { userHistory: { $ne: null } },
    ],
  }).lean().sort({ createdOn: -1 });

  const userMetricsReportLastUpdatedDate = await ReportModel.findOne({
    $and: [
      { userMetrics: { $exists: true } },
      { userMetrics: { $ne: null } },
    ],
  }).lean().sort({ createdOn: -1 });
  // reportId is a unique key for FE and BE to identify this report by.
  // this shuld not change once set
  const reports = [
    {
      reportId: ReportType.AccountTypes,
      name: 'Account Types',
      description: 'Breakdown of accounts by type',
      lastUpdated: dayjs().utc().toDate(),
    },
    {
      reportId: ReportType.AccountsAdded,
      name: 'Accounts Added ',
      description: 'A cumulative view of accounts added to the platform over the past thirty days.',
      lastUpdated: dayjs().utc().toDate(),
    },
    {
      reportId: ReportType.AccountsAddedHistory,
      name: 'Accounts Added History',
      description: 'A cumulative view of accounts added to the platform.',
      lastUpdated: dayjs().utc().toDate(),
    },
    {
      reportId: ReportType.CarbonOffsets,
      name: 'Carbon Offsets',
      description: 'A breakdown of user carbon offset purchases per day.',
      lastUpdated: dayjs().utc().toDate(),
    },
    {
      reportId: ReportType.UserSignup,
      name: 'User Signups',
      description: 'A cumulative view user signups per day.',
      lastUpdated: dayjs().utc().toDate(),
    },
    {
      reportId: ReportType.UserLoginsThirtyDays,
      name: 'Logins Per Day: 30 Days',
      description: 'Daily login counts over the past thirty days.',
      lastUpdated: dayjs().utc().toDate(),
    },
    {
      reportId: ReportType.UserLoginsSevenDays,
      name: 'Logins Per Day: 7 Days',
      description: 'Daily login counts over the past seven days.',
      lastUpdated: dayjs().utc().toDate(),
    },
    {
      reportId: ReportType.CumulativeUserLoginThirtyDays,
      name: 'Logins Total: 30 Days',
      description: 'Total login counts over the past thirty days.',
      lastUpdated: dayjs().utc().toDate(),
    },
    {
      reportId: ReportType.CumulativeUserLoginsSevenDays,
      name: 'Logins Total: 7 Days',
      description: 'Total login counts over the past seven days.',
      lastUpdated: dayjs().utc().toDate(),
    },
  ];

  if (!!userMetricsReportLastUpdatedDate?.createdOn) {
    reports.push({
      reportId: ReportType.User,
      name: 'User Metrics',
      description:
        'User signups and cards added to the platform over the past thirty days.',
      lastUpdated: dayjs(userMetricsReportLastUpdatedDate.createdOn).utc().toDate(),
    });
  }
  if (!!userHistoryReportLastUpdatedDate?.createdOn) {
    reports.push({
      reportId: ReportType.UserHistory,
      name: 'Historical User Metrics',
      description: 'User signups and cards added to the platform.',
      lastUpdated: dayjs(userHistoryReportLastUpdatedDate?.createdOn).utc().toDate(),
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

    return { ...report.adminSummary, lastUpdated: report.createdOn };
  } catch (err) {
    throw asCustomError(err);
  }
};
