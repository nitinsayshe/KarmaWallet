import { ErrorTypes } from '../../lib/constants';
import CustomError from '../../lib/customError';
import { UserModel } from '../../models/user';
import { serviceAccount } from './firebaseConfig';

const admin = require('firebase-admin');

// Initialize the Firebase Admin SDK (should be done before sending messages)
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // Other Firebase configuration options here
});

export interface IPushNotification {
  notification: {
    title: string,
    body: string,
  },
  token: string,
}
export const sendPushNotification = async (userId: any, notification: IPushNotification) => {
  // Find user by its user_id to get the FCM token stored in database
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new CustomError('No user found', ErrorTypes.NOT_FOUND);
  }
  // notification.token = user.integrations.fcm.token;
  // Send the message to devices targeted by its FCM token
  await admin.messaging().send(notification)
    .then((response: any) => {
      console.log('Successfully sent message:', response);
    })
    .catch((error: any) => {
      console.log('Error sending message:', error);
    });
};
