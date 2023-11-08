import admin from 'firebase-admin';
import { INotificationDocument } from '../../models/notification';
import { IUserDocument } from '../../models/user';
import { saveNotification } from '../../services/notification';
import { getShareableUser } from '../../services/user';
import 'dotenv/config';

export const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
  universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN,
};

// Initialize the Firebase Admin SDK (should be done before sending messages)
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    // Other Firebase configuration options here
  });
} catch (error) {
  console.log('Error in initializing firebase app', error);
}

export interface IFCMNotification {
  title: string,
  body: string,
  type?: string
}
export interface IPushNotification {
  notification: IFCMNotification,
  token: string,
  data: {
    type: string
  }

}
export const sendPushNotification = (user: IUserDocument, notificationObject: IFCMNotification, notificationDataToSave: INotificationDocument) => {
  // Get FCM token of the user
  try {
    const { integrations } = getShareableUser(user);
    const { fcm } = integrations;
    // Filter out the fcm array having non null token
    const filteredFCM = fcm.filter(item => item.token !== null);
    let errorInSendingMessage;
    filteredFCM.forEach(async (fcmObject) => {
      // Send the notification to devices targeted by its FCM token
      const pushNotification: IPushNotification = {
        notification: {
          title: notificationObject.title,
          body: notificationObject.body,
        },
        token: fcmObject.token,
        data: {
          type: notificationObject.type,
        },
      };

      await admin.messaging().send(pushNotification as any)
        .catch((error: any) => {
          errorInSendingMessage = error;
          console.log('Error in sending push notification: ', error);
        });
    });

    try {
      if (!errorInSendingMessage && notificationDataToSave) { saveNotification(notificationDataToSave); }
    } catch (error) {
      console.log('Error in saving notification', error);
    }
  } catch (error) {
    console.log('Error in sending notification', error);
  }
};
