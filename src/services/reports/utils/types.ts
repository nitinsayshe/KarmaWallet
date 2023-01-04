export enum ReportType {
  CarbonOffsets = 'carbon-offsets',
  CardsAdded = 'cards-added',
  TransactionMonitor = 'transaction-monitor',
  UserSignup = 'user-signups',
  UserLoginsSevenDays = 'user-logins-seven-days',
  UserLoginsThirtyDays = 'user-logins-thirty-days',
}

export interface IReportRequestParams {
  reportId: ReportType;
}

export interface IReportRequestQuery {
  daysInPast: string;
}
