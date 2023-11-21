export const NotificationChannelEnum = {
  Email: 'email',
  InApp: 'inApp',
  None: 'none',
  Push: 'push',
} as const;
export type NotificationChannelEnumValue = (typeof NotificationChannelEnum)[keyof typeof NotificationChannelEnum];

export const NotificationTypeEnum = {
  ACHTransferInitiation: 'achTransferInitiation',
  BalanceThreshold: 'balanceThreshold',
  CardTransition: 'cardTransition',
  DiningTransaction: 'diningTransaction',
  EarnedCashback: 'earnedCashback',
  FundsAvailable: 'fundsAvailable',
  GasTransaction: 'gasTransaction',
  Group: 'group',
  KarmaCardWelcome: 'karmaCardWelcome',
  Marketing: 'marketing',
  Payout: 'payout',
  ReloadSuccess: 'reloadSuccess',
  TransactionComplete: 'transactionComplete',
  NoChargebackRights: 'noChargebackRights',
} as const;
export type NotificationTypeEnumValue = (typeof NotificationTypeEnum)[keyof typeof NotificationTypeEnum];

export const NotificationEffectsEnum = {
  SendEarnedCashbackEmail: 'SendEarnedCashbackEmail',
  SendPayoutIssuedEmail: 'SendPayoutIssuedEmail',
  SendPushNotification: 'SendPushNotification',
  SendACHInitiationEmail: 'SendACHInitiationEmail',
  SendNoChargebackRightsEmail: 'SendNoChargebackRightsEmail',
  SendKarmaCardWelcomeEmail: 'SendKarmaCardWelcomeEmail',
} as const;
export type NotificationEffectsEnumValue = (typeof NotificationEffectsEnum)[keyof typeof NotificationEffectsEnum];

export enum PushNotificationTypes {
  BALANCE_THRESHOLD = 'BALANCE_THRESHOLD',
  ACH_TRANSFER_INITIATION = 'ACH_TRANSFER_INITIATION',
  CARD_TRANSITION = 'CARD_TRANSITION',
  EARNED_CASHBACK = 'EARNED_CASHBACK',
  FUNDS_AVAILABLE = 'FUNDS_AVAILABLE',
  RELOAD_SUCCESS = 'RELOAD_SUCCESS',
  REWARD_DEPOSIT = 'REWARD_DEPOSIT',
  TRANSACTION_COMPLETE = 'TRANSACTION_COMPLETE',
  TRANSACTION_OF_DINING = 'TRANSACTION_OF_DINING',
  TRANSACTION_OF_GAS = 'TRANSACTION_OF_GAS',
}
