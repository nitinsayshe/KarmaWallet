export enum QueueNames {
  Main = 'main',
  Email = 'email',
}

export enum CsvReportTypes {
  Transactions = 'transactions',
  Users = 'users',
  Affiliates = 'affiliates',
}

export enum UserReportType {
  Historical = 'historical',
  ThirtyDays = 'thirtyDays',
}

export enum StatementReportType {
  MonthlyIdempotent = 'monthlyIdempotent',
}

export enum JobNames {
  AssociationNegativeToPositiveTransactions = 'associate-negative-to-positive-transactions',
  CacheGroupOffsetData = 'cache-group-offset-data',
  CachedDataCleanup = 'cached-data-cleanup',
  CalculateAverageSectorScores = 'calculate-average-sector-scores',
  CalculateCompanyScores = 'calculate-company-scores',
  CreateBatchCompanies = 'create-batch-companies',
  CreateBatchDataSources = 'create-batch-data-sources',
  MarqetaDataSync = 'marqeta-transaction-sync',
  GenerateGroupOffsetStatements = 'generate-group-offset-statements',
  GenerateUserImpactTotals = 'generate-user-impact-totals',
  GenerateUserTransactionTotals = 'generate-user-transaction-totals',
  GlobalPlaidTransactionMapper = 'global-plaid-transaction-mapper',
  SendEmail = 'send-email',
  TotalOffsetsForAllUsers = 'total-offsets-for-all-users',
  UserMonthlyImpactReport = 'user-monthly-impact-report',
  ResetTestIdentities= 'reset-test-identities',
  UserPlaidTransactionMapper = 'user-plaid-transaction-mapper',
  UpdateBouncedEmails = 'update-bounced-emails',
  SendWelcomeFlowEmails = 'send-welcome-flow-emails',
  UpdateBatchCompanyDataSources = 'update-batch-company-data-sources',
  UpdateBatchCompanyParentChildrenRelationships = 'update-batch-company-parent-children-relationships',
  UpdateRareProjectAverage = 'update-rare-project-average',
  UploadCsvToGoogleDrive = 'upload-csv-to-google-drive',
  DeleteUserAndAssociatedData = 'delete-user-and-associated-data',
  UpdateWildfireMerchantsAndData = 'update-wildfire-merchants-and-data',
  UpdateKardMerchantsAndData = 'update-kard-merchants-and-data',
  GenerateCommissionPayouts = 'generate-commission-payouts',
  GenerateAdminSummaryReport = 'generate-admin-summary-report',
  GenerateUserReport = 'generate-user-report',
  PersonaWebhookProcessor = 'persona-webhook-processor',
  UpdateWildfireCommissions = 'update-wildfire-commissions',
  SyncActiveCampaign = 'sync-active-campaign',
  SendAccountCreationReminderEmail = 'send-account-creation-reminder-email',
  GenerateKarmaCardStatements = 'generate-karma-card-statements',
  KardCommissionReconciliation = 'kard-commission-reconciliation',
  OrderKarmaWalletCards = 'order-karma-wallet-cards',
  WordpressArticleSync = 'wordpress-article-sync',
}

export const MarqetaDataSyncTypeEnum = {
  Transactions: 'transactions',
  Users: 'users',
  Cards: 'cards',
};

export type MarqetaSyncJobTypeEnumValues = (typeof MarqetaDataSyncTypeEnum)[keyof typeof MarqetaDataSyncTypeEnum];
