import { NotificationTypeEnum, NotificationChannelEnum, NotificationEffectsEnum, NotificationTypeEnumValue } from '../../lib/constants/notification';
import { INotificationDocument, NotificationModel } from '../../models/notification';

const template: { [key:string]: Partial<INotificationDocument> } = {
  /* [NotificationTypeEnum.Group]: { */
  /*   type: NotificationTypeEnum.Group, */
  /*   channels: [], */
  /* }, */
  /* [NotificationTypeEnum.Payout]: { */
  /*   type: NotificationTypeEnum.Payout, */
  /*   channels: [NotificationChannelEnum.Email, NotificationChannelEnum.Push], */
  /*   effects: [NotificationEffectsEnum.SendPayoutIssuedEmail, NotificationEffectsEnum.SendPushNotification], */
  /* }, */
  /* [NotificationTypeEnum.Marketing]: { */
  /*   type: NotificationTypeEnum.Marketing, */
  /*   channels: [], */
  /* }, */
  /* [NotificationTypeEnum.EarnedCashback]: { */
  /*   type: NotificationTypeEnum.EarnedCashback, */
  /*   channels: [NotificationChannelEnum.Push, NotificationChannelEnum.Email], */
  /*   effects: [NotificationEffectsEnum.SendPushNotification, NotificationEffectsEnum.SendEarnedCashbackEmail], */
  /* }, */
  /* [NotificationTypeEnum.CardTransition]: { */
  /*   type: NotificationTypeEnum.CardTransition, */
  /*   channels: [NotificationChannelEnum.Push], */
  /*   effects: [NotificationEffectsEnum.SendPushNotification], */
  /* }, */
  /* [NotificationTypeEnum.BalanceThreshold]: { */
  /*   type: NotificationTypeEnum.BalanceThreshold, */
  /*   channels: [NotificationChannelEnum.Push], */
  /*   effects: [NotificationEffectsEnum.SendPushNotification], */
  /* }, */
  /* [NotificationTypeEnum.FundsAvailable]: { */
  /*   type: NotificationTypeEnum.FundsAvailable, */
  /*   channels: [NotificationChannelEnum.Push], */
  /*   effects: [NotificationEffectsEnum.SendPushNotification], */
  /* }, */
  /* [NotificationTypeEnum.ReloadSuccess]: { */
  /*   type: NotificationTypeEnum.ReloadSuccess, */
  /*   channels: [NotificationChannelEnum.Push], */
  /*   effects: [NotificationEffectsEnum.SendPushNotification], */
  /* }, */
  /* [NotificationTypeEnum.TransactionComplete]: { */
  /*   type: NotificationTypeEnum.TransactionComplete, */
  /*   channels: [NotificationChannelEnum.Push], */
  /*   effects: [NotificationEffectsEnum.SendPushNotification], */
  /* }, */
  /* [NotificationTypeEnum.DiningTransaction]: { */
  /*   type: NotificationTypeEnum.DiningTransaction, */
  /*   channels: [NotificationChannelEnum.Push], */
  /*   effects: [NotificationEffectsEnum.SendPushNotification], */
  /* }, */
  /* [NotificationTypeEnum.GasTransaction]: { */
  /*   type: NotificationTypeEnum.GasTransaction, */
  /*   channels: [NotificationChannelEnum.Push], */
  /*   effects: [NotificationEffectsEnum.SendPushNotification], */
  /* }, */
  // [NotificationTypeEnum.CaseWonProvisionalCreditAlreadyIssued]: {
  //   type: NotificationTypeEnum.CaseWonProvisionalCreditAlreadyIssued,
  //   channels: [NotificationChannelEnum.Email],
  //   effects: [NotificationEffectsEnum.SendCaseWonProvisionalCreditAlreadyIssuedEmail],
  // },
  [NotificationTypeEnum.ProvisionalCreditIssued]: {
    type: NotificationTypeEnum.ProvisionalCreditIssued,
    channels: [NotificationChannelEnum.Email],
    effects: [NotificationEffectsEnum.SendProvisionalCreditIssuedEmail],
  },
};

export const createNotifications = async () => {
  const notifications = await NotificationModel.find({});
  const notificationsMap = notifications.reduce(
    (acc, notification) => {
      if (!notification) {
        return acc;
      }
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
