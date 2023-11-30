import { sendPushNotification } from '../../integrations/firebaseCloudMessaging';
import { ErrorTypes } from '../../lib/constants';
import { NotificationChannelEnum, NotificationEffectsEnum, NotificationEffectsEnumValue } from '../../lib/constants/notification';
import CustomError from '../../lib/customError';
import { IUserDocument } from '../../models/user';
import {
  IBankLinkedConfirmationEmailData,
  ICardShippedNotificationData,
  ICaseLostProvisionalCreditIssuedData,
  ICaseWonProvisionalCreditAlreadyIssuedNotificationData,
  ICaseWonProvisionalCreditNotAlreadyIssuedNotificationData,
  IEarnedCashbackNotificationData,
  IKarmaCardWelcomeData,
  IPayoutNotificationData,
  IProvisialCreditIssuedData,
  IPushNotificationData,
} from '../../models/user_notification';
import { sendEarnedCashbackRewardEmail, sendCashbackPayoutEmail, sendCaseWonProvisionalCreditAlreadyIssuedEmail, sendACHInitiationEmail, sendNoChargebackRightsEmail, sendCaseLostProvisionalCreditAlreadyIssuedEmail, sendKarmaCardWelcomeEmail, sendProvisionalCreditIssuedEmail, sendBankLinkedConfirmationEmail, sendCaseWonProvisionalCreditNotAlreadyIssuedEmail, sendCardShippedEmail, sendCardDeliveredEmail } from '../email';
import { IACHTransferEmailData, IDisputeEmailData } from '../email/types';

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

export const handleSendCaseWonProvisionalCreditAlreadyIssuedEmailEffect = async <DataType>(
  user: IUserDocument,
  data: DataType,
): Promise<void> => {
  const d = data as unknown as ICaseWonProvisionalCreditAlreadyIssuedNotificationData;
  if (!d) throw new Error('Invalid case won provisional creadit already issued notification data');
  try {
    await sendCaseWonProvisionalCreditAlreadyIssuedEmail({
      user: user._id,
      recipientEmail: user?.emails?.find((email) => email?.primary)?.email,
      name: d?.name,
      amount: d?.amount,
      merchantName: d?.merchantName,
      submittedClaimDate: d?.submittedClaimDate,
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
    await sendKarmaCardWelcomeEmail({
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

export const handleSendProvisionalCreditIssuedEmailEffect = async <DataType>(user: IUserDocument, data: DataType): Promise<void> => {
  const d = data as unknown as IProvisialCreditIssuedData;
  if (!d) throw new Error('Invalid payout notification data');
  try {
    await sendProvisionalCreditIssuedEmail({
      user: user._id,
      recipientEmail: user?.emails?.find((email) => email?.primary)?.email,
      name: d?.name,
      amount: d?.amount,
    });
  } catch (err) {
    console.error(err);
    throw new CustomError('Error sending payout email', ErrorTypes.SERVER);
  }
};

export const handleSendCaseLostProvisionalCreditAlreadyIssuedEmailEffect = async <DataType>(user: IUserDocument, data: DataType): Promise<void> => {
  const d = data as unknown as ICaseLostProvisionalCreditIssuedData;
  const { amount, date, name, reversalDate, companyName, reason } = d;
  if (!d) throw new Error('Invalid case lost provisional credit issued data');

  try {
    await sendCaseLostProvisionalCreditAlreadyIssuedEmail({
      user,
      name,
      amount,
      date,
      reversalDate,
      reason,
      companyName,
    });
  } catch (err) {
    console.error(err);
    throw new CustomError('Error sending case lost provisional credit issued email', ErrorTypes.SERVER);
  }
};

export const handleSendBankLinkedConfirmationEmailEffect = async <DataType>(user: IUserDocument, data: DataType): Promise<void> => {
  const d = data as unknown as IBankLinkedConfirmationEmailData;
  const { lastDigitsOfBankAccountNumber, instituteName, name } = d;
  if (!d) throw new Error('Invalid bank linked user data');
  try {
    await sendBankLinkedConfirmationEmail({
      user: user._id,
      name,
      instituteName,
      lastDigitsOfBankAccountNumber,
      recipientEmail: user?.emails?.find((email) => email?.primary)?.email,
    });
  } catch (err) {
    console.error(err);
    throw new CustomError('Error sending bank linked confirmation email', ErrorTypes.SERVER);
  }
};

export const handleCaseWonProvisionalCreditNotAlreadyIssuedEffect = async <DataType>(user: IUserDocument, data: DataType): Promise<void> => {
  const d = data as unknown as ICaseWonProvisionalCreditNotAlreadyIssuedNotificationData;
  const { amount, companyName, name, date } = d;
  if (!d) throw new Error('Invalid case won provisional credit not already issued data');
  try {
    await sendCaseWonProvisionalCreditNotAlreadyIssuedEmail({
      user: user._id,
      recipientEmail: user?.emails?.find((email) => email?.primary)?.email,
      name,
      amount,
      companyName,
      date,
    });
  } catch (err) {
    console.log(err);
    throw new CustomError('Error sending case won provisional credit not already issued email', ErrorTypes.SERVER);
  }
};

export const handleCardShippedEffect = async <DataType>(user: IUserDocument, data: DataType): Promise<void> => {
  const d = data as unknown as ICardShippedNotificationData;
  const { name } = d;
  if (!d) throw new Error('Invalid card shipped data');
  try {
    await sendCardShippedEmail({
      user: user._id,
      recipientEmail: user?.emails?.find((email) => email?.primary)?.email,
      name,
    });
  } catch (err) {
    console.log(err);
    throw new CustomError('Error sending card shipped email', ErrorTypes.SERVER);
  }
};

export const handleCardDeliveredEffect = async <DataType>(user: IUserDocument, data: DataType): Promise<void> => {
  const d = data as unknown as ICardShippedNotificationData;
  const { name } = d;
  if (!d) throw new Error('Invalid card shipped data');
  try {
    await sendCardDeliveredEmail({
      user: user._id,
      recipientEmail: user?.emails?.find((email) => email?.primary)?.email,
      name,
    });
  } catch (err) {
    console.log(err);
    throw new CustomError('Error sending card shipped email', ErrorTypes.SERVER);
  }
};

export const NotificationEffectsFunctions: {
  [key in NotificationEffectsEnumValue]: <DataType>(user: IUserDocument, data: DataType) => Promise<void>;
} = {
  SendEarnedCashbackEmail: handleSendEarnedCashBackEmailEffect,
  SendPayoutIssuedEmail: handleSendPayoutIssuedEmailEffect,
  SendCaseWonProvisionalCreditAlreadyIssuedEmail: handleSendCaseWonProvisionalCreditAlreadyIssuedEmailEffect,
  SendPushNotification: handlePushEffect,
  SendACHInitiationEmail: handleSendACHInitiationEmailEffect,
  SendNoChargebackRightsEmail: handleSendNoChargebackRightsEmailEffect,
  SendKarmaCardWelcomeEmail: handleSendKarmaCardWelcomeEmailEffect,
  SendCaseLostProvisionalCreditAlreadyIssuedEmail: handleSendCaseWonProvisionalCreditAlreadyIssuedEmailEffect,
  SendProvisionalCreditIssuedEmail: handleSendProvisionalCreditIssuedEmailEffect,
  SendBankLinkedConfirmationEmail: handleSendBankLinkedConfirmationEmailEffect,
  SendCaseWonProvisionalCreditNotAlreadyIssuedEmail: handleCaseWonProvisionalCreditNotAlreadyIssuedEffect,
  SendCardShippedEmail: handleCardShippedEffect,
  SendCardDeliveredEmail: handleCardShippedEffect,
} as const;

export const NotificationChannelEffects = {
  [NotificationChannelEnum.Email]: [
    NotificationEffectsEnum.SendEarnedCashbackEmail,
    NotificationEffectsEnum.SendPayoutIssuedEmail,
    NotificationEffectsEnum.SendACHInitiationEmail,
    NotificationEffectsEnum.SendKarmaCardWelcomeEmail,
    NotificationEffectsEnum.SendBankLinkedConfirmationEmail,
    NotificationEffectsEnum.SendCaseWonProvisionalCreditAlreadyIssuedEmail,
    NotificationEffectsEnum.SendProvisionalCreditIssuedEmail,
    NotificationEffectsEnum.SendCaseWonProvisionalCreditNotAlreadyIssuedEmail,
    NotificationEffectsEnum.SendCardShippedEmail,
  ],
  [NotificationChannelEnum.Push]: [
    NotificationEffectsEnum.SendPushNotification,
  ],
  [NotificationChannelEnum.InApp]: [],
  [NotificationChannelEnum.None]: [],
} as const;
