export enum QueueNames {
  Main = 'main',
  Email = 'email',
}

export enum CsvReportTypes {
  Transactions = 'transactions',
  Users = 'users',
}

export enum JobNames {
  AssociationNegativeToPositiveTransactions = 'associate-negative-to-positive-transactions',
  CacheGroupOffsetData = 'cache-group-offset-data',
  CachedDataCleanup = 'cached-data-cleanup',
  CalculateAverageSectorScores = 'calculate-average-sector-scores',
  CalculateCompanyScores = 'calculate-company-scores',
  CreateBatchCompanies = 'create-batch-companies',
  CreateBatchDataSources = 'create-batch-data-sources',
  GenerateGroupOffsetStatements = 'generate-group-offset-statements',
  GenerateUserImpactTotals = 'generate-user-impact-totals',
  GenerateUserTransactionTotals = 'generate-user-transaction-totals',
  GlobalPlaidTransactionMapper = 'global-plaid-transaction-mapper',
  SendEmail = 'send-email',
  TotalOffsetsForAllUsers = 'total-offsets-for-all-users',
  TransactionsMonitor = 'transactions-monitor',
  UserMonthlyImpactReport = 'user-monthly-impact-report',
  UserPlaidTransactionMapper = 'user-plaid-transaction-mapper',
  UpdateBouncedEmails = 'update-bounced-emails',
  SendWelcomeFlowEmails = 'send-welcome-flow-emails',
  UpdateBatchCompanyDataSources = 'update-batch-company-data-sources',
  UpdateBatchCompanyParentChildrenRelationships = 'update-batch-company-parent-children-relationships',
  UpdateRareProjectAverage = 'update-rare-project-average',
  UploadCsvToGoogleDrive = 'upload-csv-to-google-drive',
  DeleteUserAndAssociatedData = 'delete-user-and-associated-data',
}
