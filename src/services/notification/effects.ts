import { sendPushNotification } from '../../integrations/firebaseCloudMessaging';
import { ErrorTypes } from '../../lib/constants';
import { NotificationChannelEnum, NotificationEffectsEnum, NotificationEffectsEnumValue } from '../../lib/constants/notification';
import CustomError from '../../lib/customError';
import {
  IBankLinkedConfirmationEmailData,
  ICardShippedNotificationData,
  ICaseLostProvisionalCreditIssuedData,
  ICaseWonProvisionalCreditAlreadyIssuedNotificationData,
  ICaseWonProvisionalCreditNotAlreadyIssuedNotificationData,
  IEarnedCashbackNotificationData,
  IEmployerGiftData,
  IKarmaCardWelcomeData,
  IPayoutNotificationData,
  IProvisialCreditIssuedData,
  IPushNotificationData,
} from '../../models/user_notification';
import { sendEarnedCashbackRewardEmail, sendCashbackPayoutEmail, sendCaseWonProvisionalCreditAlreadyIssuedEmail, sendACHInitiationEmail, sendNoChargebackRightsEmail, sendCaseLostProvisionalCreditAlreadyIssuedEmail, sendKarmaCardWelcomeEmail, sendProvisionalCreditIssuedEmail, sendBankLinkedConfirmationEmail, sendCaseWonProvisionalCreditNotAlreadyIssuedEmail, sendCardShippedEmail, sendDisputeReceivedNoProvisionalCreditIssuedEmail, sendCaseLostProvisionalCreditNotAlreadyIssuedEmail, sendEmployerGiftEmail, sendACHCancelledEmail, sendACHReturnedEmail, sendKarmaCardDeclinedEmail, sendResumeKarmaCardApplicationEmail } from '../email';
import { IACHTransferEmailData, IDisputeEmailData, IKarmaCardDeclinedEmailData } from '../email/types';
import { IEffectFunctionParams, IResumeKarmaCardEmailData } from './types';

export const handlePushEffect = async ({ user, data }: IEffectFunctionParams): Promise<void> => {
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

export const handleSendEarnedCashBackEmailEffect = async ({ user, data } : IEffectFunctionParams): Promise<void> => {
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

export const handleSendPayoutIssuedEmailEffect = async ({ user, data } : IEffectFunctionParams): Promise<void> => {
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

export const handleSendCaseWonProvisionalCreditAlreadyIssuedEmailEffect = async ({ user, data } : IEffectFunctionParams): Promise<void> => {
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

export const handleSendACHInitiationEmailEffect = async ({ user, data } : IEffectFunctionParams): Promise<void> => {
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

export const handleSendACHCancelledEmailEffect = async ({ user, data } : IEffectFunctionParams): Promise<void> => {
  const d = data as unknown as IACHTransferEmailData;
  const { date, amount, accountMask, accountType, name } = d;
  if (!d) throw new Error('Invalid ach initiation notification data');
  try {
    await sendACHCancelledEmail({
      user,
      amount,
      accountMask,
      accountType,
      date,
      name,
    });
  } catch (err) {
    console.error(err);
    throw new CustomError('Error sending ach cancelled email', ErrorTypes.SERVER);
  }
};

export const handleSendACHReturnedEmailEffect = async ({ user, data } : IEffectFunctionParams): Promise<void> => {
  const d = data as unknown as IACHTransferEmailData;
  const { date, amount, accountMask, accountType, name, reason } = d;
  if (!d) throw new Error('Invalid ach initiation notification data');
  try {
    await sendACHReturnedEmail({
      user,
      amount,
      accountMask,
      accountType,
      date,
      name,
      reason,
    });
  } catch (err) {
    console.error(err);
    throw new CustomError('Error sending ach returned email', ErrorTypes.SERVER);
  }
};

export const handleSendNoChargebackRightsEmailEffect = async ({ user, data } : IEffectFunctionParams): Promise<void> => {
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

export const handleSendKarmaCardWelcomeEmailEffect = async ({ user, data } : IEffectFunctionParams): Promise<void> => {
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

export const handleSendProvisionalCreditIssuedEmailEffect = async ({ user, data } : IEffectFunctionParams): Promise<void> => {
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

export const handleSendCaseLostProvisionalCreditAlreadyIssuedEmailEffect = async ({ user, data } : IEffectFunctionParams): Promise<void> => {
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

export const handleSendCaseLostProvisionalCreditNotAlreadyIssuedEmailEffect = async ({ user, data } : IEffectFunctionParams): Promise<void> => {
  const d = data as unknown as ICaseLostProvisionalCreditIssuedData;
  const { amount, date, name, companyName, reason } = d;
  if (!d) throw new Error('Invalid case lost provisional credit not already issued issued data');

  try {
    await sendCaseLostProvisionalCreditNotAlreadyIssuedEmail({
      user,
      name,
      amount,
      date,
      reason,
      companyName,
    });
  } catch (err) {
    console.error(err);
    throw new CustomError('Error sending case lost provisional credit not already issued email', ErrorTypes.SERVER);
  }
};

export const handleSendBankLinkedConfirmationEmailEffect = async ({ user, data } : IEffectFunctionParams): Promise<void> => {
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

export const handleCaseWonProvisionalCreditNotAlreadyIssuedEffect = async ({ user, data } : IEffectFunctionParams): Promise<void> => {
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

export const handleDisputeReceivedNoProvisionalCreditIssuedEffect = async ({ user, data } : IEffectFunctionParams): Promise<void> => {
  const d = data as unknown as ICaseWonProvisionalCreditNotAlreadyIssuedNotificationData;
  const { name } = d;
  if (!d) throw new Error('Invalid case won provisional credit not already issued data');
  try {
    await sendDisputeReceivedNoProvisionalCreditIssuedEmail({
      user: user._id,
      recipientEmail: user?.emails?.find((email) => email?.primary)?.email,
      name,
    });
  } catch (err) {
    console.log(err);
    throw new CustomError('Error sending dispute received no provisional credit issued email', ErrorTypes.SERVER);
  }
};
export const handleCardShippedEffect = async ({ user, data } : IEffectFunctionParams): Promise<void> => {
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

export const handleSendEmployerGiftEmailEffect = async ({ user, data } : IEffectFunctionParams): Promise<void> => {
  const d = data as unknown as IEmployerGiftData;
  const { name, amount } = d;
  if (!d) throw new Error('Invalid employer gift data');
  try {
    await sendEmployerGiftEmail({
      user: user._id,
      recipientEmail: user?.emails?.find((email) => email?.primary)?.email,
      name,
      amount,
    });
  } catch (err) {
    console.log(err);
    throw new CustomError('Error sending employer gift email', ErrorTypes.SERVER);
  }
};

export const handleKarmaCardDeclinedEmailEffect = async ({ user, visitor, data } : IEffectFunctionParams): Promise<void> => {
  const { name } = data;

  if (!user && !visitor) throw new Error('Invalid karma card declined data');

  try {
    const sendEmailData: IKarmaCardDeclinedEmailData = {
      name,
    };

    if (!!user) {
      sendEmailData.user = user._id;
      sendEmailData.recipientEmail = user?.emails?.find((email: any) => email?.primary)?.email;
    }

    if (!!visitor) {
      sendEmailData.visitor = visitor._id;
      sendEmailData.recipientEmail = visitor?.email;
    }

    await sendKarmaCardDeclinedEmail(sendEmailData);
  } catch (err) {
    console.log(err);
    throw new CustomError('Error sending karma card declined email', ErrorTypes.SERVER);
  }
};

export const handleResumeKarmaCardApplication = async ({ user, visitor, data } : IEffectFunctionParams): Promise<void> => {
  if (!user && !visitor) throw new Error('Invalid karma card application resume data');

  try {
    const recipientEmail = !!user ? user?.emails?.find((email: any) => email?.primary)?.email : visitor?.email;
    const sendEmailData: IResumeKarmaCardEmailData = {
      link: data.link,
      recipientEmail,
    };

    if (visitor) sendEmailData.visitor = visitor;
    if (user) sendEmailData.user = user;

    await sendResumeKarmaCardApplicationEmail(sendEmailData);
  } catch (err) {
    console.log(err);
    throw new CustomError('Error sending resume karma card application email', ErrorTypes.SERVER);
  }
};

export const NotificationEffectsFunctions: {
  [key in NotificationEffectsEnumValue]: ({ user, visitor, data }: IEffectFunctionParams) => Promise<void>;
} = {
  SendEarnedCashbackEmail: handleSendEarnedCashBackEmailEffect,
  SendPayoutIssuedEmail: handleSendPayoutIssuedEmailEffect,
  SendCaseWonProvisionalCreditAlreadyIssuedEmail: handleSendCaseWonProvisionalCreditAlreadyIssuedEmailEffect,
  SendPushNotification: handlePushEffect,
  SendACHInitiationEmail: handleSendACHInitiationEmailEffect,
  SendACHCancelledEmail: handleSendACHCancelledEmailEffect,
  SendACHReturnedEmail: handleSendACHReturnedEmailEffect,
  SendNoChargebackRightsEmail: handleSendNoChargebackRightsEmailEffect,
  SendKarmaCardWelcomeEmail: handleSendKarmaCardWelcomeEmailEffect,
  SendKarmaCardDeclinedEmail: handleKarmaCardDeclinedEmailEffect,
  SendCaseLostProvisionalCreditAlreadyIssuedEmail: handleSendCaseWonProvisionalCreditAlreadyIssuedEmailEffect,
  SendProvisionalCreditIssuedEmail: handleSendProvisionalCreditIssuedEmailEffect,
  SendBankLinkedConfirmationEmail: handleSendBankLinkedConfirmationEmailEffect,
  SendCaseWonProvisionalCreditNotAlreadyIssuedEmail: handleCaseWonProvisionalCreditNotAlreadyIssuedEffect,
  SendDisputeReceivedNoProvisionalCreditIssuedEmail: handleDisputeReceivedNoProvisionalCreditIssuedEffect,
  SendCardShippedEmail: handleCardShippedEffect,
  SendCaseLostProvisionalCreditNotAlreadyIssued: handleSendCaseLostProvisionalCreditNotAlreadyIssuedEmailEffect,
  SendEmployerGiftEmail: handleSendEmployerGiftEmailEffect,
  SendResumeKarmaCardApplicationEmail: handleResumeKarmaCardApplication,
} as const;

export const NotificationChannelEffects = {
  [NotificationChannelEnum.Email]: [
    NotificationEffectsEnum.SendEarnedCashbackEmail,
    NotificationEffectsEnum.SendPayoutIssuedEmail,
    NotificationEffectsEnum.SendCaseWonProvisionalCreditAlreadyIssuedEmail,
    NotificationEffectsEnum.SendACHInitiationEmail,
    NotificationEffectsEnum.SendACHCancelledEmail,
    NotificationEffectsEnum.SendACHReturnedEmail,
    NotificationEffectsEnum.SendNoChargebackRightsEmail,
    NotificationEffectsEnum.SendKarmaCardDeclinedEmail,
    NotificationEffectsEnum.SendKarmaCardWelcomeEmail,
    NotificationEffectsEnum.SendCaseLostProvisionalCreditAlreadyIssuedEmail,
    NotificationEffectsEnum.SendProvisionalCreditIssuedEmail,
    NotificationEffectsEnum.SendBankLinkedConfirmationEmail,
    NotificationEffectsEnum.SendCaseWonProvisionalCreditNotAlreadyIssuedEmail,
    NotificationEffectsEnum.SendDisputeReceivedNoProvisionalCreditIssuedEmail,
    NotificationEffectsEnum.SendCardShippedEmail,
    NotificationEffectsEnum.SendCaseLostProvisionalCreditNotAlreadyIssued,
    NotificationEffectsEnum.SendEmployerGiftEmail,
    NotificationEffectsEnum.SendResumeKarmaCardApplicationEmail,
  ],
  [NotificationChannelEnum.Push]: [
    NotificationEffectsEnum.SendPushNotification,
  ],
  [NotificationChannelEnum.InApp]: [],
  [NotificationChannelEnum.None]: [],
} as const;
