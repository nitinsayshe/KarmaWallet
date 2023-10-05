import { IUserDocument } from '../../models/user';
import { getShareableUser } from '../../services/user';
import { serviceAccount } from './firebaseConfig';

const admin = require('firebase-admin');

// Initialize the Firebase Admin SDK (should be done before sending messages)
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // Other Firebase configuration options here
});

export interface IFCMNotification {
  title: string,
  body: string,
}
export interface IPushNotification {
  notification: IFCMNotification,
  token: string,
}
export const sendPushNotification = (user: IUserDocument, notification: IFCMNotification) => {
  // Get FCM token of the user
  const { integrations } = getShareableUser(user);
  const { tokens } = integrations.fcm;
  tokens.forEach(async (token) => {
    // Send the message to devices targeted by its FCM token
    const pushNotification: IPushNotification = {
      notification,
      token,
    };
    console.log('Notification Data:', notification);
    await admin.messaging().send(pushNotification)
      .then((response: any) => {
        console.log('Successfully sent message:', response);
      })
      .catch((error: any) => {
        console.log('Error sending message:', error);
      });
  });
};
