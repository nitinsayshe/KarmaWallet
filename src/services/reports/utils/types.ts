export enum ReportType {
  AccountsAdded = 'accounts-added',
  AccountsAddedHistory = 'accounts-added-history',
  AccountsUnlinkedOrRemoved = 'accounts-unlinked-or-removed',
  AccountTypes = 'account-types',
  CarbonOffsets = 'carbon-offsets',
  CumulativeUserLoginsSevenDays = 'cumulative-user-logins-seven-days',
  CumulativeUserLoginThirtyDays = 'cumulative-user-logins-thirty-days',
  PromoUsersByCampaign = 'promo-users-by-campaign',
  PromoUsersBySource = 'promo-users-by-source',
  PromoUsersByAccountStatus = 'promo-users-with-linked-accounts',
  TransactionMonitor = 'transaction-monitor',
  UserHistory = 'user-history',
  UserLoginsSevenDays = 'user-logins-seven-days',
  UserLoginsThirtyDays = 'user-logins-thirty-days',
  UserSignup = 'user-signups',
  User = 'user',
}

export interface IReportRequestParams {
  reportId: ReportType;
}

export interface IReportRequestQuery {
  daysInPast: string;
  fullHistory: boolean;
}
