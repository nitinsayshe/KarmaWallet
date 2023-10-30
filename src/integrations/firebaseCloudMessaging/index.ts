import { INotificationDocument } from '../../models/notification';
import { IUserDocument } from '../../models/user';
import { saveNotification } from '../../services/notification';
import { getShareableUser } from '../../services/user';
import 'dotenv/config';

const admin = require('firebase-admin');

// export const serviceAccount = {
//   type: process.env.FIREBASE_TYPE,
//   project_id: process.env.FIREBASE_PROJECT_ID,
//   private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
//   private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
//   client_email: process.env.FIREBASE_CLIENT_EMAIL,
//   client_id: process.env.FIREBASE_CLIENT_ID,
//   auth_uri: process.env.FIREBASE_AUTH_URI,
//   token_uri: process.env.FIREBASE_TOKEN_URI,
//   auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
//   client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
//   universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN,
// };

const serviceAccount = {
  type: 'service_account',
  project_id: 'staging-karma-wallet-card-app',
  private_key_id: '1b6972bf0723be8d2c6a50f5ac034f7ca80b335e',
  private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC3ILJGybRVtQJl\nfmRa4EzH7tTqyARFCMl4/9wZv/IyvozWoEj8FtfRtKFVodDmWyKE9aX+zyqVk4LF\n13JquHds3K7NLIt9I7ZIFLm9raI3N4G4YkjhuMlRlqVlrBi6+Mr3TEvmUDj0AD6P\nrpbENbNQc0N+bPqaMsWQPhu+xqeW3pWtSrBQxJyMKnM7llF8YqfqtFvCeba5JXn0\n6wInOnVud6kRFZU4NOZJNg0XrWT9DUSclQHRIg2ZDqF5Q7tCzKz18CU0MxupcYdt\nI7ktEvtFlCD/vanKkui+ZWOaOFDwj2G0kn2EtljlZwQIQ8CEoTqUOidp3IXoHqrq\nTLgU1EszAgMBAAECggEANBDGvxuP+yI4qTSTQcct7VY5EPuHQz1pUs6j/Go3aTgG\nAOuXdJzmBYhuqlMUeroEiXryFA1AlUBYWPmVXURPKBNiW5FDo3Oo2ruRx5z7Vumg\nJxVClXKdQmYrZknUyiv8QO1fUv8SAkWjg+RmlyiRb9klomdHpNm0k/sklkwSz/DD\nDDQtZKYfWkUlqhBr4bJ7WWaZWR+DXf4PqbFLID5YYpMrZjW4Oxz9aXBz5N6co2Nh\nNjaqTMUKdNC/TxSS/KuIAH58a5FEPGM2cR2Z3qFOuXQEYzilRHhcogZhs0ZXYTRi\n7JgLtmI3lucVlU9ekPwkFKGvRuFhqEKv3E40IUyDEQKBgQDxzpi85QUSeMdVbNSi\n5hDcUAsLVX/AIO6bekzrqN+dD3sEJ54aO5SPUPXnNKGKvPe7wmFWV8dTa0UGOw+M\n9J7nc4gPVvDE3ldADm9j/IGFGfg0IqwE6mxRoBvrkhzgegR5YSG4YrMaC+9INHXR\nAn5cXfWRK1l24fjNyz/hTepZ6QKBgQDB4GHGdI/Ew3zWPOpLn4GGMi0vZpp4U1yr\ngqtSMjhhBVh5+OFcgIu5UmF17R+y0bfMZjDcKMiqBhCpxH22IF2aCeUAjeSSly0z\nJ79hEiI9Lxo0A9AIhgAF+TgCotYBvwT2rvv72YM5qw/G+mJm0EKzVeJ9wN910xpA\nqTIQ297uuwKBgDD9qJhs1jA95DT8jcBLWJMqbHJpai6k/XLmvnrohhWuM0BOPowW\nEi1PO+MSGMChNJgH8+yocCwIib2PbcEjNqayE5j4BmP8oDTMN+lMGXm8HzuA4tVE\nIZoQFFgQDGW2kv18nnZbGOpoDJzWdCBanvtb1gsJe2DIu74GNfUR8i8xAoGBALvf\nBoB8JXEjik5EmzoK6EW1S8n6IEfnaA6fQgsVtUJ3HqSbgy7TNhKwfNb8oFH1HamJ\ngWFmeAUieXU5fiRFus5xNiNSXKOcsWU36CFVpC4r/bVX2HjZ+R3QwfD0AHOSummd\naXtE7P+t/0zvBvngaDJGUINRqnkPxwnPqz9hAOfPAoGAG20y+UHn0pE4Rf6LuIe0\nys7uMgctiRFsJ5JDvjZnEh6wC+TLowZGk8S10wYT7dkptVr6U8D9YRS+lvfO6tsE\nINjcml2nzEmlJ7tcoj9R39GVmVM2Zb6cXcPGB6CUxUOZgLeTrGEqApFNxpzC4e8a\nyitaPKTYEES0hQljZO1GaHc=\n-----END PRIVATE KEY-----\n',
  client_email: 'firebase-adminsdk-qppzw@staging-karma-wallet-card-app.iam.gserviceaccount.com',
  client_id: '113561990063747099100',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-qppzw%40staging-karma-wallet-card-app.iam.gserviceaccount.com',
  universe_domain: 'googleapis.com',
};
// Initialize the Firebase Admin SDK (should be done before sending messages)
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // Other Firebase configuration options here
  });
} catch (error) {
  console.log('Error in initializing firebase app');
}

export interface IFCMNotification {
  title: string,
  body: string,
  type?: string
}
export interface IPushNotification {
  notification: IFCMNotification,
  token: String,
  data: {
    type: string
  }

}
export const sendPushNotification = (user: IUserDocument, notificationObject: IFCMNotification, notificationDataToSave: INotificationDocument) => {
  // Get FCM token of the user
  const { integrations } = getShareableUser(user);
  const { fcm } = integrations;

  fcm.forEach(async (fcmObject) => {
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

    await admin.messaging().send(pushNotification)
      .catch((error: any) => {
        console.log('Error in sending push notification: ', error);
      });
  });
  try {
    if (notificationDataToSave) { saveNotification(notificationDataToSave); }
  } catch (error) {
    console.log('Error in saving notification', error);
  }
};
