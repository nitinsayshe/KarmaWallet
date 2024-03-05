import { NotificationChannelEnum, NotificationEffectsEnum, NotificationTypeEnum } from '../../lib/constants/notification';
import { IUpdateableDocument, updateDocumentsWithUpsert } from '../../lib/model';
import { INotificationDocument, NotificationModel } from '../../models/notification';

const template: { [key: string]: Partial<INotificationDocument> } = {
  // [NotificationTypeEnum.Group]: {
  //   type: NotificationTypeEnum.Group,
  //   channels: [],
  // },
  // [NotificationTypeEnum.Payout]: {
  //   type: NotificationTypeEnum.Payout,
  //   channels: [NotificationChannelEnum.Email, NotificationChannelEnum.Push],
  //   effects: [NotificationEffectsEnum.SendPayoutIssuedEmail, NotificationEffectsEnum.SendPushNotification],
  // },
  // [NotificationTypeEnum.Marketing]: {
  //   type: NotificationTypeEnum.Marketing,
  //   channels: [],
  // },
  // [NotificationTypeEnum.EarnedCashback]: {
  //   type: NotificationTypeEnum.EarnedCashback,
  //   channels: [NotificationChannelEnum.Push, NotificationChannelEnum.Email],
  //   effects: [NotificationEffectsEnum.SendPushNotification, NotificationEffectsEnum.SendEarnedCashbackEmail],
  // },
  // [NotificationTypeEnum.CardTransition]: {
  //   type: NotificationTypeEnum.CardTransition,
  //   channels: [NotificationChannelEnum.Push],
  //   effects: [NotificationEffectsEnum.SendPushNotification],
  // },
  // [NotificationTypeEnum.BalanceThreshold]: {
  //   type: NotificationTypeEnum.BalanceThreshold,
  //   channels: [NotificationChannelEnum.Push],
  //   effects: [NotificationEffectsEnum.SendPushNotification],
  // },
  // [NotificationTypeEnum.FundsAvailable]: {
  //   type: NotificationTypeEnum.FundsAvailable,
  //   channels: [NotificationChannelEnum.Push],
  //   effects: [NotificationEffectsEnum.SendPushNotification],
  // },
  // [NotificationTypeEnum.ReloadSuccess]: {
  //   type: NotificationTypeEnum.ReloadSuccess,
  //   channels: [NotificationChannelEnum.Push],
  //   effects: [NotificationEffectsEnum.SendPushNotification],
  // },
  // [NotificationTypeEnum.TransactionComplete]: {
  //   type: NotificationTypeEnum.TransactionComplete,
  //   channels: [NotificationChannelEnum.Push],
  //   effects: [NotificationEffectsEnum.SendPushNotification],
  // },
  // [NotificationTypeEnum.DiningTransaction]: {
  //   type: NotificationTypeEnum.DiningTransaction,
  //   channels: [NotificationChannelEnum.Push],
  //   effects: [NotificationEffectsEnum.SendPushNotification],
  // },
  // [NotificationTypeEnum.GasTransaction]: {
  //   type: NotificationTypeEnum.GasTransaction,
  //   channels: [NotificationChannelEnum.Push],
  //   effects: [NotificationEffectsEnum.SendPushNotification],
  // },
  // [NotificationTypeEnum.CaseWonProvisionalCreditAlreadyIssued]: {
  //   type: NotificationTypeEnum.CaseWonProvisionalCreditAlreadyIssued,
  //   channels: [NotificationChannelEnum.Email],
  //   effects: [NotificationEffectsEnum.SendCaseWonProvisionalCreditAlreadyIssuedEmail],
  // },
  // [NotificationTypeEnum.CaseLostProvisionalCreditAlreadyIssued]: {
  //   type: NotificationTypeEnum.CaseLostProvisionalCreditAlreadyIssued,
  //   channels: [NotificationChannelEnum.Email],
  //   effects: [NotificationEffectsEnum.SendCaseLostProvisionalCreditAlreadyIssuedEmail],
  // },
  // [NotificationTypeEnum.ProvisionalCreditIssued]: {
  //   type: NotificationTypeEnum.ProvisionalCreditIssued,
  //   channels: [NotificationChannelEnum.Email],
  //   effects: [NotificationEffectsEnum.SendProvisionalCreditIssuedEmail],
  // },
  // [NotificationTypeEnum.CaseWonProvisionalCreditNotAlreadyIssued]: {
  //   type: NotificationTypeEnum.CaseWonProvisionalCreditNotAlreadyIssued,
  //   channels: [NotificationChannelEnum.Email],
  //   effects: [NotificationEffectsEnum.SendCaseWonProvisionalCreditNotAlreadyIssuedEmail],
  // },
  // [NotificationTypeEnum.DisputeReceivedNoProvisionalCreditIssued]: {
  //   type: NotificationTypeEnum.DisputeReceivedNoProvisionalCreditIssued,
  //   channels: [NotificationChannelEnum.Email],
  //   effects: [NotificationEffectsEnum.SendDisputeReceivedNoProvisionalCreditIssuedEmail],
  // },
  // [NotificationTypeEnum.CardShipped]: {
  //   type: NotificationTypeEnum.CardShipped,
  //   channels: [NotificationChannelEnum.Email],
  //   effects: [NotificationEffectsEnum.SendCardShippedEmail],
  // },
  // [NotificationTypeEnum.CaseLostProvisionalCreditNotAlreadyIssued]: {
  //   type: NotificationTypeEnum.CaseLostProvisionalCreditNotAlreadyIssued,
  //   channels: [NotificationChannelEnum.Email],
  //   effects: [NotificationEffectsEnum.SendCaseLostProvisionalCreditNotAlreadyIssued],
  // },
  // [NotificationTypeEnum.ACHTransferInitiation]: {
  //   type: NotificationTypeEnum.ACHTransferInitiation,
  //   channels: [NotificationChannelEnum.Email],
  //   effects: [NotificationEffectsEnum.SendACHInitiationEmail],
  // },
  // [NotificationTypeEnum.KarmaCardWelcome]: {
  //   type: NotificationTypeEnum.KarmaCardWelcome,
  //   channels: [NotificationChannelEnum.Email],
  //   effects: [NotificationEffectsEnum.SendKarmaCardWelcomeEmail],
  // },
  // [NotificationTypeEnum.ACHTransferCancelled]: {
  //   type: NotificationTypeEnum.ACHTransferCancelled,
  //   channels: [NotificationChannelEnum.Push, NotificationChannelEnum.Email],
  //   effects: [NotificationEffectsEnum.SendPushNotification, NotificationEffectsEnum.SendACHCancelledEmail],
  // },
  // [NotificationTypeEnum.ACHTransferReturned]: {
  //   type: NotificationTypeEnum.ACHTransferReturned,
  //   channels: [NotificationChannelEnum.Push, NotificationChannelEnum.Email],
  //   effects: [NotificationEffectsEnum.SendPushNotification, NotificationEffectsEnum.SendACHReturnedEmail],
  // },
  [NotificationTypeEnum.KarmaCardDeclined]: {
    type: NotificationTypeEnum.KarmaCardDeclined,
    channels: [NotificationChannelEnum.Email],
    effects: [NotificationEffectsEnum.SendKarmaCardDeclinedEmail],
  },
};

export const createNotifications = async () => {
  const notifications: INotificationDocument[] = Object.values(template).map((notification) => {
    const newNotification = new NotificationModel();
    console.log('notification', notification);
    try {
      newNotification.set(notification);
    } catch (err) {
      console.log('!!!!!Error Setting notification data', err);
      console.log(JSON.stringify(notification));
    }
    return newNotification as INotificationDocument;
  });

  await updateDocumentsWithUpsert(notifications as unknown as IUpdateableDocument[]);
};

export const deleteAllNotifications = async () => {
  try {
    await NotificationModel.deleteMany({});
  } catch (err) {
    console.error(err);
  }
};

export const recreateNotifications = async () => {
  console.log('///// deleting notifications...');
  await deleteAllNotifications();
  console.log('///// done deleting notifications');
  console.log('///// creating notifications...');
  await createNotifications();
  console.log('///// done recreating notifications');
};
