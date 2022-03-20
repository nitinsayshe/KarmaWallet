export enum ReportType {
  CarbonOffsets = 'carbon-offsets',
  CardsAdded = 'cards-added',
  TransactionMonitor = 'transaction-monitor',
  UserSignup = 'user-signups',
}

export interface IReportRequestParams {
  reportId: ReportType;
}

export interface IReportRequestQuery {
  daysInPast: string;
}
