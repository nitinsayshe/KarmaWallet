export enum ReportType {
  AccountTypes = 'account-types',
  CarbonOffsets = 'carbon-offsets',
  AccountsAdded = 'accounts-added',
  AccountsUnlinkedOrRemoved = 'accounts-unlinked-or-removed',
  AccountsAddedHistory = 'accounts-added-history',
  TransactionMonitor = 'transaction-monitor',
  UserSignup = 'user-signups',
  User = 'user',
  UserHistory = 'user-history',
  UserLoginsSevenDays = 'user-logins-seven-days',
  UserLoginsThirtyDays = 'user-logins-thirty-days',
  CumulativeUserLoginsSevenDays = 'cumulative-user-logins-seven-days',
  CumulativeUserLoginThirtyDays = 'cumulative-user-logins-thirty-days',
}

export interface IReportRequestParams {
  reportId: ReportType;
}

export interface IReportRequestQuery {
  daysInPast: string;
  fullHistory: boolean;
}
