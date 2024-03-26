import 'dotenv/config';
import type { FirebaseMessagingError } from 'firebase-admin/lib/utils/error';
import admin, { FirebaseError } from 'firebase-admin';
import { IUserDocument } from '../../models/user';
import { IFCMNotification, IPushNotification } from './types';

export const serviceAccount = {
  type: 'service_account',
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
  universe_domain: 'googleapis.com',
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

const isFirebaseMessagingError = (error: FirebaseError): error is FirebaseMessagingError => error?.code?.startsWith('messaging/');

const sendPushNotificationAndRemoveTokenIfNotRegistered = async (
  user: IUserDocument,
  token: string,
  notificationObject: IFCMNotification,
) => {
  try {
    const pushNotification: IPushNotification = {
      notification: {
        title: notificationObject.title,
        body: notificationObject.body,
      },
      token,
      data: {
        type: notificationObject.type,
      },
    };

    await admin.messaging().send(pushNotification as any);
  } catch (error) {
    const err = error as FirebaseError;
    if (isFirebaseMessagingError(err) && err.code === 'messaging/registration-token-not-registered') {
      // remove invalid token from the database
      console.log(`Removing unregistered token: ${token} for user: ${user._id}`);
      user.integrations.fcm = user.integrations.fcm.filter((fcm) => fcm.token !== token);
      await user.save();
    } else {
      throw error;
    }
  }
};

export const sendPushNotification = async (user: IUserDocument, notificationObject: IFCMNotification) => {
  // Get FCM token of the user
  try {
    const { integrations } = user;
    const { fcm } = integrations;
    // Filter out the fcm array having non null token
    const filteredFCM = fcm.filter((item) => item.token !== null);
    for (const fcmObject of filteredFCM) {
      // Send the notification to devices targeted by its FCM token
      await sendPushNotificationAndRemoveTokenIfNotRegistered(user, fcmObject.token, notificationObject);
    }
  } catch (error) {
    console.log('Error in sending notification', error);
  }
};
