export const NotificationChannelEnum = {
  Email: 'email',
  InApp: 'inApp',
  None: 'none',
  Push: 'push',
} as const;
export type NotificationChannelEnumValue = (typeof NotificationChannelEnum)[keyof typeof NotificationChannelEnum];

export const NotificationTypeEnum = {
  BalanceThreshold: 'balanceThreshold',
  CardTransition: 'cardTransition',
  DiningTransaction: 'diningTransaction',
  EarnedCashback: 'earnedCashback',
  FundsAvailable: 'fundsAvailable',
  GasTransaction: 'gasTransaction',
  Group: 'group',
  Marketing: 'marketing',
  Payout: 'payout',
  ReloadSuccess: 'reloadSuccess',
  TransactionComplete: 'transactionComplete',
} as const;
export type NotificationTypeEnumValue = (typeof NotificationTypeEnum)[keyof typeof NotificationTypeEnum];

export const NotificationEffectsEnum = {
  SendEarnedCashbackEmail: 'SendEarnedCashbackEmail',
  SendPayoutIssuedEmail: 'SendPayoutIssuedEmail',
  SendPushNotification: 'SendPushNotification',
} as const;
export type NotificationEffectsEnumValue = (typeof NotificationEffectsEnum)[keyof typeof NotificationEffectsEnum];

export enum PushNotificationTypes {
  BALANCE_THRESHOLD = 'BALANCE_THRESHOLD',
  CARD_TRANSITION = 'CARD_TRANSITION',
  EARNED_CASHBACK = 'EARNED_CASHBACK',
  FUNDS_AVAILABLE = 'FUNDS_AVAILABLE',
  RELOAD_SUCCESS = 'RELOAD_SUCCESS',
  REWARD_DEPOSIT = 'REWARD_DEPOSIT',
  TRANSACTION_COMPLETE = 'TRANSACTION_COMPLETE',
  TRANSACTION_OF_DINING = 'TRANSACTION_OF_DINING',
  TRANSACTION_OF_GAS = 'TRANSACTION_OF_GAS',
}
