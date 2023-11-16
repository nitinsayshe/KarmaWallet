import { sendPushNotification } from '../../integrations/firebaseCloudMessaging';
import { ErrorTypes } from '../../lib/constants';
import { NotificationChannelEnum, NotificationEffectsEnum, NotificationEffectsEnumValue } from '../../lib/constants/notification';
import CustomError from '../../lib/customError';
import { IUserDocument } from '../../models/user';
import {
  IEarnedCashbackNotificationData,
  IPayoutNotificationData,
  IPushNotificationData,
} from '../../models/user_notification';
import { sendCashbackPayoutEmail, sendEarnedCashbackRewardEmail } from '../email';

export const handlePushEffect = async <DataType>(user: IUserDocument, data: DataType): Promise<void> => {
  const d = data as unknown as IPushNotificationData;
  if (!d) throw new Error('Invalid card transition notification data');
  try {
    const { title, body, pushNotificationType: type } = d;
    if (!type || !title || !body) {
      return;
    }

    await sendPushNotification(user, { title, body, type });
  } catch (err) {
    console.error(err);
    throw new CustomError('Error sending card transition push notification', ErrorTypes.SERVER);
  }
};

export const handleSendEarnedCashBackEmailEffect = async <DataType>(user: IUserDocument, data: DataType): Promise<void> => {
  const d = data as unknown as IEarnedCashbackNotificationData;
  if (!d) throw new Error('Invalid earned cashback notification data');
  try {
    await sendEarnedCashbackRewardEmail({
      user: user._id,
      recipientEmail: user?.emails?.find((email) => email?.primary)?.email,
      name: d?.name,
      companyName: d?.companyName,
    });
  } catch (err) {
    console.error(err);
    throw new CustomError('Error sending cashback email', ErrorTypes.SERVER);
  }
};

export const handleSendPayoutIssuedEmailEffect = async <DataType>(user: IUserDocument, data: DataType): Promise<void> => {
  const d = data as unknown as IPayoutNotificationData;
  if (!d) throw new Error('Invalid payout notification data');
  try {
    await sendCashbackPayoutEmail({
      user: user._id,
      recipientEmail: user?.emails?.find((email) => email?.primary)?.email,
      name: d?.name,
      amount: d?.payoutAmount,
    });
  } catch (err) {
    console.error(err);
    throw new CustomError('Error sending payout email', ErrorTypes.SERVER);
  }
};

export const NotificationEffectsFunctions: {
  [key in NotificationEffectsEnumValue]: <DataType>(user: IUserDocument, data: DataType) => Promise<void>;
} = {
  SendEarnedCashbackEmail: handleSendEarnedCashBackEmailEffect,
  SendPayoutIssuedEmail: handleSendPayoutIssuedEmailEffect,
  SendPushNotification: handlePushEffect,
} as const;

export const NotificationChannelEffects = {
  [NotificationChannelEnum.Email]: [NotificationEffectsEnum.SendEarnedCashbackEmail, NotificationEffectsEnum.SendPayoutIssuedEmail],
  [NotificationChannelEnum.Push]: [
    NotificationEffectsEnum.SendPushNotification,
  ],
  [NotificationChannelEnum.InApp]: [],
  [NotificationChannelEnum.None]: [],
} as const;
