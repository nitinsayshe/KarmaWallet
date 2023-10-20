import { IFCMNotification, sendPushNotification } from '.';
import { IUserDocument } from '../../models/user';

export const sendNotificationOfEarnedReward = (user: IUserDocument, amount: number) => {
  if (amount) {
    const notification: IFCMNotification = {
      title: 'Received Cashback',
      body: `You earned $${amount} in Karma Cash`,
    };
    sendPushNotification(user, notification);
  }
};

export const sendNotificationOfRewardDeposit = (user: IUserDocument, amount: number) => {
  if (amount) {
    const notification: IFCMNotification = {
      title: 'Received Cashback',
      body: `$${amount} in Karma Cash has been deposited into your Karma Wallet Card`,
    };
    sendPushNotification(user, notification);
  }
};

export const sendNotificationOfFundsAvailable = (user: IUserDocument) => {
  const notification: IFCMNotification = {
    title: 'Deposit Alert',
    body: 'Your funds are now available on your Karma Wallet Card!',
  };
  sendPushNotification(user, notification);
};

export const sendNotificationOfTransaction = (user: IUserDocument, amount: number, companyName: string) => {
  if (amount) {
    const notification: IFCMNotification = {
      title: 'Transaction Complete',
      body: `$${amount} spent at ${companyName}`,
    };
    sendPushNotification(user, notification);
  }
};

export const sendNotificationOfBalanceThreshold = (user: IUserDocument, redirectLink: string) => {
  const notification: IFCMNotification = {
    title: 'Low Balance Alert',
    body: 'Your account has a low balance. Click to reload your Karma Wallet Card.',
    data: {
      redirectLink,
    },
  };
  sendPushNotification(user, notification);
};

export const sendNotificationForReloadSuccess = (user: IUserDocument, redirectLink: string) => {
  const notification: IFCMNotification = {
    title: 'Reload Success',
    body: 'Your Karma Wallet Card has been reloaded. Click to check your updated account balance!',
    data: {
      redirectLink,
    },
  };
  sendPushNotification(user, notification);
};

export const sendNotificationForSpendingOnDining = (user: IUserDocument) => {
  const notification: IFCMNotification = {
    title: 'Woohoo!',
    body: 'You dined out. We donated a meal.',
  };
  sendPushNotification(user, notification);
};

export const sendNotificationForSpendingOnGas = (user: IUserDocument) => {
  const notification: IFCMNotification = {
    title: 'Woohoo!',
    body: 'You bought gas. We donated to reforestation.',
  };
  sendPushNotification(user, notification);
};

export const sendNotificationForCardTransition = (user: IUserDocument, state: String) => {
  const notification: IFCMNotification = {
    title: 'Security Alert!',
    body: state === 'ACTIVE' ? 'You have successfully activated your card.' : 'You have successfully deactivated your card.',
  };
  sendPushNotification(user, notification);
};
