import 'dotenv/config';
import admin from 'firebase-admin';
import { IUserDocument } from '../../models/user';
import { IFCMNotification, IPushNotification } from './types';

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
export const sendPushNotification = async (
  user: IUserDocument,
  notificationObject: IFCMNotification,
) => {
  // Get FCM token of the user
  try {
    const { integrations } = user;
    const { fcm } = integrations;
    // Filter out the fcm array having non null token
    const filteredFCM = fcm.filter((item) => item.token !== null);
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

      await admin.messaging().send(pushNotification as any);
    });
  } catch (error) {
    console.log('Error in sending notification', error);
  }
};
