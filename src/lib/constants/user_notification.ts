export const UserNotificationResourceTypeEnum = {
  Group: 'group',
  Transaction: 'transaction',
  CommissionPayout: 'commissionPayout',
} as const;
export type UserNotificationResourceTypeEnumValue =
  (typeof UserNotificationResourceTypeEnum)[keyof typeof UserNotificationResourceTypeEnum];

export const UserNotificationStatusEnum = {
  Queued: 'queued',
  Unread: 'unread',
  Read: 'read',
  Deleted: 'deleted',
} as const;
export type UserNotificationStatusEnumValue = (typeof UserNotificationStatusEnum)[keyof typeof UserNotificationStatusEnum];
