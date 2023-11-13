import { NotificationChannelEnum, NotificationEffectsEnum, NotificationTypeEnum, NotificationTypeEnumValue } from '../../lib/constants/notification';
import { INotificationDocument, NotificationModel } from '../../models/notificaiton';

const template: { [key in NotificationTypeEnumValue]: Partial<INotificationDocument> } = {
  [NotificationTypeEnum.Group]: {
    type: NotificationTypeEnum.Group,
    channels: [],
  },
  [NotificationTypeEnum.Payout]: {
    type: NotificationTypeEnum.Payout,
    channels: [NotificationChannelEnum.Email],
    effects: [NotificationEffectsEnum.SendPayoutIssuedEmail],
  },
  [NotificationTypeEnum.Marketing]: {
    type: NotificationTypeEnum.Marketing,
    channels: [],
  },
  [NotificationTypeEnum.EarnedCashback]: {
    type: NotificationTypeEnum.EarnedCashback,
    channels: [NotificationChannelEnum.Email],
    effects: [NotificationEffectsEnum.SendEarnedCashbackEmail],
  },
};
export const createNotifications = async () => {
  const notifications = await NotificationModel.find({});
  const notificationsMap = notifications.reduce(
    (acc, notification) => {
      acc[notification.type] = notification;
      return acc;
    },
    {} as { [key in NotificationTypeEnumValue]: INotificationDocument },
  );
  const notificationsToCreate = Object.entries(template)
    .map(([type, notification]) => {
      // @ts-ignore
      if (!!notificationsMap[type.toString()]) {
        return null;
      }
      return notification;
    })
    .filter((notification) => !!notification);
  await NotificationModel.insertMany(notificationsToCreate);
};
