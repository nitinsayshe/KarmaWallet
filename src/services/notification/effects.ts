import { sendPushNotification } from '../../integrations/firebaseCloudMessaging';
import { ErrorTypes } from '../../lib/constants';
import { NotificationChannelEnum, NotificationEffectsEnum, NotificationEffectsEnumValue } from '../../lib/constants/notification';
import CustomError from '../../lib/customError';
import { IUserDocument } from '../../models/user';
import {
  IEarnedCashbackNotificationData,
  IKarmaCardWelcomeData,
  IPayoutNotificationData,
  IPushNotificationData,
} from '../../models/user_notification';
import { IACHTransferEmailData, IDisputeEmailData } from '../email/types';
import { SendKarmaCardWelcomeEmail, sendACHInitiationEmail, sendCashbackPayoutEmail, sendEarnedCashbackRewardEmail, sendNoChargebackRightsEmail } from '../email';

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

export const handleSendACHInitiationEmailEffect = async <DataType>(user: IUserDocument, data: DataType): Promise<void> => {
  const d = data as unknown as IACHTransferEmailData;
  const { date, amount, accountMask, accountType, name } = d;
  if (!d) throw new Error('Invalid ach initiation notification data');
  try {
    await sendACHInitiationEmail({
      user,
      amount,
      accountMask,
      accountType,
      date,
      name,
    });
  } catch (err) {
    console.error(err);
    throw new CustomError('Error sending ach initiation email', ErrorTypes.SERVER);
  }
};

export const handleSendNoChargebackRightsEmailEffect = async <DataType>(user: IUserDocument, data: DataType): Promise<void> => {
  const d = data as unknown as IDisputeEmailData;
  const { amount, companyName, name } = d;
  if (!d) throw new Error('Invalid no chargeback rights notification data');
  try {
    await sendNoChargebackRightsEmail({
      user,
      amount,
      companyName,
      name,
    });
  } catch (err) {
    console.error(err);
    throw new CustomError('Error sending no chargeback rights email', ErrorTypes.SERVER);
  }
};

export const handleSendKarmaCardWelcomeEmailEffect = async <DataType>(user: IUserDocument, data: DataType): Promise<void> => {
  const d = data as unknown as IKarmaCardWelcomeData;
  const { newUser, name } = d;
  if (!d) throw new Error('Invalid karma card welcome data');
  try {
    await SendKarmaCardWelcomeEmail({
      user: user._id,
      name,
      newUser,
      recipientEmail: user?.emails?.find((email) => email?.primary)?.email,
    });
  } catch (err) {
    console.error(err);
    throw new CustomError('Error sending karma card welcome email', ErrorTypes.SERVER);
  }
};

export const NotificationEffectsFunctions: {
  [key in NotificationEffectsEnumValue]: <DataType>(user: IUserDocument, data: DataType) => Promise<void>;
} = {
  SendEarnedCashbackEmail: handleSendEarnedCashBackEmailEffect,
  SendPayoutIssuedEmail: handleSendPayoutIssuedEmailEffect,
  SendPushNotification: handlePushEffect,
  SendACHInitiationEmail: handleSendACHInitiationEmailEffect,
  SendNoChargebackRightsEmail: handleSendNoChargebackRightsEmailEffect,
  SendKarmaCardWelcomeEmail: handleSendKarmaCardWelcomeEmailEffect,
} as const;

export const NotificationChannelEffects = {
  [NotificationChannelEnum.Email]: [
    NotificationEffectsEnum.SendEarnedCashbackEmail,
    NotificationEffectsEnum.SendPayoutIssuedEmail,
    NotificationEffectsEnum.SendACHInitiationEmail,
    NotificationEffectsEnum.SendKarmaCardWelcomeEmail,
  ],
  [NotificationChannelEnum.Push]: [
    NotificationEffectsEnum.SendPushNotification,
  ],
  [NotificationChannelEnum.InApp]: [],
  [NotificationChannelEnum.None]: [],
} as const;
