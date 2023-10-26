import { IFCMNotification, sendPushNotification } from '.';
import { IUserDocument } from '../../models/user';

export enum PushNotificationTypes {
  EARNED_CASHBACK = 'EARNED_CASHBACK',
  REWARD_DEPOSIT = 'REWARD_DEPOSIT',
  FUNDS_AVAILABLE = 'FUNDS_AVAILABLE',
  TRANSACTION_COMPLETE = 'TRANSACTION_COMPLETE',
  BALANCE_THRESHOLD = 'BALANCE_THRESHOLD',
  RELOAD_SUCCESS = 'RELOAD_SUCCESS',
  TRANSACTION_OF_DINING = 'TRANSACTION_OF_DINING',
  TRANSACTION_OF_GAS = 'TRANSACTION_OF_GAS',
  CARD_TRANSITION = 'CARD_TRANSITION'
}

export const sendNotificationOfEarnedReward = (user: IUserDocument, amount: number) => {
  if (amount) {
    const notification: IFCMNotification = {
      title: 'Received Cashback',
      body: `You earned $${amount} in Karma Cash`,
      type: PushNotificationTypes.EARNED_CASHBACK,

    };
    sendPushNotification(user, notification);
  }
};

export const sendNotificationOfRewardDeposit = (user: IUserDocument, amount: number) => {
  if (amount) {
    const notification: IFCMNotification = {
      title: 'Received Cashback',
      body: `$${amount} in Karma Cash has been deposited into your Karma Wallet Card`,
      type: PushNotificationTypes.REWARD_DEPOSIT,

    };
    sendPushNotification(user, notification);
  }
};

export const sendNotificationOfFundsAvailable = (user: IUserDocument) => {
  const notification: IFCMNotification = {
    title: 'Deposit Alert',
    body: 'Your funds are now available on your Karma Wallet Card!',
    type: PushNotificationTypes.FUNDS_AVAILABLE,

  };
  sendPushNotification(user, notification);
};

export const sendNotificationOfTransaction = (user: IUserDocument, amount: number, companyName: string) => {
  if (amount && companyName) {
    const notification: IFCMNotification = {
      title: 'Transaction Complete',
      body: `$${amount} spent at ${companyName}`,
      type: PushNotificationTypes.TRANSACTION_COMPLETE,

    };
    sendPushNotification(user, notification);
  }
};

export const sendNotificationOfBalanceThreshold = (user: IUserDocument) => {
  const notification: IFCMNotification = {
    title: 'Low Balance Alert',
    body: 'Your account has a low balance. Click to reload your Karma Wallet Card.',
    type: PushNotificationTypes.BALANCE_THRESHOLD,

  };
  sendPushNotification(user, notification);
};

export const sendNotificationForReloadSuccess = (user: IUserDocument) => {
  const notification: IFCMNotification = {
    title: 'Reload Success',
    body: 'Your Karma Wallet Card has been reloaded. Click to check your updated account balance!',
    type: PushNotificationTypes.RELOAD_SUCCESS,

  };
  sendPushNotification(user, notification);
};

export const sendNotificationForSpendingOnDining = (user: IUserDocument) => {
  const notification: IFCMNotification = {
    title: 'Transaction Complete',
    body: 'You dined out. We donated a meal.',
    type: PushNotificationTypes.TRANSACTION_OF_DINING,

  };
  sendPushNotification(user, notification);
};

export const sendNotificationForSpendingOnGas = (user: IUserDocument) => {
  const notification: IFCMNotification = {
    title: 'Transaction Complete',
    body: 'You bought gas. We donated to reforestation.',
    type: PushNotificationTypes.TRANSACTION_OF_GAS,

  };
  sendPushNotification(user, notification);
};

export const sendNotificationForCardTransition = (user: IUserDocument, state: String) => {
  if (state) {
    const notification: IFCMNotification = {
      title: 'Security Alert!',
      body: state === 'ACTIVE' ? 'You have successfully activated your card.' : 'You have successfully deactivated your card.',
      type: PushNotificationTypes.CARD_TRANSITION,

    };
    sendPushNotification(user, notification);
  }
};

export const triggerPushNotification = (notificationType: string, user: IUserDocument, amount?: number, companyName?: string, cardState?: String) => {
  switch (notificationType) {
    case PushNotificationTypes.EARNED_CASHBACK:
      sendNotificationOfEarnedReward(user, amount);
      break;

    case PushNotificationTypes.REWARD_DEPOSIT:
      sendNotificationOfRewardDeposit(user, amount);
      break;

    case PushNotificationTypes.FUNDS_AVAILABLE:
      sendNotificationOfFundsAvailable(user);
      break;

    case PushNotificationTypes.TRANSACTION_COMPLETE:
      sendNotificationOfTransaction(user, amount, companyName);
      break;

    case PushNotificationTypes.BALANCE_THRESHOLD:
      sendNotificationOfBalanceThreshold(user);
      break;

    case PushNotificationTypes.RELOAD_SUCCESS:
      sendNotificationForReloadSuccess(user);
      break;

    case PushNotificationTypes.TRANSACTION_OF_DINING:
      sendNotificationForSpendingOnDining(user);
      break;

    case PushNotificationTypes.TRANSACTION_OF_GAS:
      sendNotificationForSpendingOnGas(user);
      break;

    case PushNotificationTypes.CARD_TRANSITION:
      sendNotificationForCardTransition(user, cardState);
      break;

    default:
      break;
  }
};
