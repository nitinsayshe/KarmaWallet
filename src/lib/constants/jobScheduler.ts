export enum QueueNames {
  Main = 'main',
}

export enum JobNames {
  CacheGroupOffsetData = 'cache-group-offset-data',
  CachedDataCleanup = 'cached-data-cleanup',
  GenerateGroupOffsetStatements = 'generate-group-offset-statements',
  GenerateUserTransactionTotals = 'generate-user-transaction-totals',
  GlobalPlaidTransactionMapper = 'global-plaid-transaction-mapper',
  SendEmail = 'send-email',
  TransactionsMonitor = 'transactions-monitor',
  UserPlaidTransactionMapper = 'user-plaid-transaction-mapper',
}
