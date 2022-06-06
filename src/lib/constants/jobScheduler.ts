export enum QueueNames {
  Main = 'main',
  Email = 'email',
}

export enum JobNames {
  CacheGroupOffsetData = 'cache-group-offset-data',
  CachedDataCleanup = 'cached-data-cleanup',
  GenerateGroupOffsetStatements = 'generate-group-offset-statements',
  GenerateUserImpactTotals = 'generate-user-impact-totals',
  GenerateUserTransactionTotals = 'generate-user-transaction-totals',
  GlobalPlaidTransactionMapper = 'global-plaid-transaction-mapper',
  SendEmail = 'send-email',
  TotalOffsetsForAllUsers = 'total-offsets-for-all-users',
  TransactionsMonitor = 'transactions-monitor',
  UserPlaidTransactionMapper = 'user-plaid-transaction-mapper',
  UpdateBouncedEmails = 'update-bounced-emails',
  SendWelcomeFlowEmails = 'send-welcome-flow-emails',
  UpdateRareProjectAverage = 'update-rare-project-average',
}
