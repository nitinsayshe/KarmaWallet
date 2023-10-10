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
  token: String,
}
export const sendPushNotification = (user: IUserDocument, notification: IFCMNotification) => {
  // Get FCM token of the user
  const { integrations } = getShareableUser(user);
  const { fcm } = integrations;
  fcm.forEach(async (fcmObject) => {
    // Send the notification to devices targeted by its FCM token
    const pushNotification: IPushNotification = {
      notification,
      token: fcmObject.token,
    };

    await admin.messaging().send(pushNotification)
      .catch((_error: any) => {
        // no-op
      });
  });
};
