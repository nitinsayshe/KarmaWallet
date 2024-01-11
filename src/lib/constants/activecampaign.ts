export enum ActiveCampaignSyncTypes {
  ARTICLE_RECOMMENDATION = 'articleRecommendations',
  BACKFILL = 'backfill',
  CARD_SIGNUP = 'cardSignup',
  CARD_SIGNUP_BACKFILL = 'cardSignupBackfill',
  CASHBACK_SIMULATION = 'cashbackSimulation',
  CASHBACK_SIMULATION_WEEKLY = 'cashbackSimulationWeekly',
  REMOVE_DUPLICATE_CONTACT_AUTOMAITONS = 'removeDuplicateContactAutomations',
  DAILY = 'daily',
  GROUP = 'group',
  INITIAL = 'initial',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  SPENDING_ANALYSIS = 'spendingAnalysis',
  UNLINKED_AND_REMOVED_ACCOUNTS = 'unlinkedAndRemovedAccounts',
  WEEKLY = 'weekly',
  YEARLY = 'yearly',
  LINKED_ACCOUNTS= 'linkedAccounts',
}

export enum ActiveCampaignCustomFields {
  carbonEmissionsMonthly = 'carbonEmissionsMonthly',
  carbonEmissionsYearly = 'carbonEmissionsYearly',
  carbonOffsetDollars = 'carbonOffsetDollars',
  carbonOffsetTonnes = 'carbonOffsetTonnes',
  cashbackDollarsAvailable = 'cashbackDollarsAvailable',
  cashbackDollarsEarnedMonthly = 'cashbackDollarsEarnedMonthly',
  cashbackDollarsEarnedYearly = 'cashbackDollarsEarnedYearly',
  dateJoined = 'dateJoined',
  existingWebAppUser = 'existingWebAppUser',
  firstLinkedCardDate = 'firstLinkedCardDate',
  hasLinkedCard = 'hasLinkedCard',
  hasLinkedPaypal = 'hasLinkedPaypal',
  impactnegative = 'impactnegative',
  impactneutral = 'impactneutral',
  impactpositive = 'impactpositive',
  karmaScoreYearly = 'karmaScoreYearly',
  lastLinkedCardDate = 'lastLinkedCardDate',
  lastLogin = 'lastLogin',
  loginCountLastMonth = 'loginCountLastMonth',
  loginCountLastWeek = 'loginCountLastWeek',
  loginCountLastYear = 'loginCountLastYear',
  loginCountTotal = 'loginCountTotal',
  madeCashbackEligiblePurchase = 'madeCashbackEligiblePurchase',
  missedCashbackDollarsLastMonth = 'missedCashbackDollarsLastMonth',
  missedCashbackDollarsLastWeek = 'missedCashbackDollarsLastWeek',
  missedCashbackTransactionNumberLastMonth = 'missedCashbackTransactionNumberLastMonth',
  missedCashbackTransactionNumberLastWeek = 'missedCashbackTransactionNumberLastWeek',
  monthsKarmaScore = 'monthsKarmaScore',
  negativePurchaseDollarsLastThirtyDays = 'negativePurchaseDollarsLastThirtyDays',
  numLinkedCards = 'numLinkedCards',
  numNegativePurchasesLastThirtyDays = 'numNegativePurchasesLastThirtyDays',
  numPositivePurchasesLastThirtyDays = 'numPositivePurchasesLastThirtyDays',
  positivePurchaseDollarsLastThirtyDays = 'positivePurchaseDollarsLastThirtyDays',
  recommendedArticles = 'recommendedArticles',
  removedAccountsPastThirtyDays = 'removedAccountsPastThirtyDays',
  unlinkedAccountsPastThirtyDays = 'unlinkedAccountsPastThirtyDays',
  userId = 'userId',
}
