export enum ReportType {
  CarbonOffsets = 'carbon-offsets',
  CardsAdded = 'cards-added',
  CardsAddedHistory = 'cards-added-history',
  TransactionMonitor = 'transaction-monitor',
  UserSignup = 'user-signups',
  User = 'user',
  UserLoginsSevenDays = 'user-logins-seven-days',
  UserLoginsThirtyDays = 'user-logins-thirty-days',
}

export interface IReportRequestParams {
  reportId: ReportType;
}

export interface IReportRequestQuery {
  daysInPast: string;
}
