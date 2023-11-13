export const NotificationChannelEnum = {
  Email: 'email',
  Push: 'push',
  InApp: 'inApp',
  None: 'none',
} as const;
export type NotificationChannelEnumValue = (typeof NotificationChannelEnum)[keyof typeof NotificationChannelEnum];

export const NotificationTypeEnum = {
  Marketing: 'marketing',
  Group: 'transaction',
  EarnedCashback: 'earnedCashback',
  Payout: 'payout',
} as const;
export type NotificationTypeEnumValue = (typeof NotificationTypeEnum)[keyof typeof NotificationTypeEnum];

export const NotificationEffectsEnum = {
  SendEarnedCashbackEmail: 'SendEarnedCashbackEmail',
  SendPayoutIssuedEmail: 'SendPayoutIssuedEmail',
} as const;
export type NotificationEffectsEnumValue = (typeof NotificationEffectsEnum)[keyof typeof NotificationEffectsEnum];
