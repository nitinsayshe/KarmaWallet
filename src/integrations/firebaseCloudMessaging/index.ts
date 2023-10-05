import { ErrorTypes } from '../../lib/constants';
import CustomError from '../../lib/customError';
import { UserModel } from '../../models/user';

// import { serviceAccount } from './firebaseConfig';
const FCM = require('fcm-node');
// const admin = require('firebase-admin');

// Initialize the Firebase Admin SDK (should be done before sending messages)
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
//   // Other Firebase configuration options here
// });

export interface IPushNotification {
  notification: {
    title: string,
    body: string,
  },
  to: string,
}
export const sendPushNotification = async (userId: any, notification: IPushNotification) => {
  // Find user by its user_id to get the FCM token stored in database
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new CustomError('No user found', ErrorTypes.NOT_FOUND);
  }
  notification.to = user.integrations.fcm.token;
  // const message = {
  //   data: {
  //     score: '850',
  //     time: '2:45',
  //   },
  //   token: user.integrations.fcm.token,
  // };
  // notification.to = 'eohGBnuBokHjoDgBXty9CE:APA91bEZ4IiHLe0yeGXmXcOqpRQeFZKJnvFs0GlGkF1uBkjWmbD3W2_8M7LipLkctLrnYEltQRYQ2vVdmyrwc8IOQ3foBp3x4Nu_BwumZ9NqFL0OMTfQtyn7A8MBa1KBxIBoXXxU-cjV';
  // // Send the message to devices targeted by its FCM token
  // console.log('Notification Data:', notification);
  // await admin.messaging().send(message)
  //   .then((response: any) => {
  //     console.log('Successfully sent message:', response);
  //   })
  //   .catch((error: any) => {
  //     console.log('Error sending message:', error);
  //   });

  const serverKey = 'AAAAxBuHsNM:APA91bEYo_3krk29bRjCBwW6RbLzUoIyC1lzjVJZ0A4oRjJmffscJB97IbvGYnA0KbKVGcumHlnwQsC7eFUBeBVtMheyR6gDptOCqVAReqJeF7hAleg_4Owheb5FenMyllGKgS5sZf2t';
  const fcm = new FCM(serverKey);

  // const message = {
  //   to: 'eohGBnuBokHjoDgBXty9CE:APA91bEZ4IiHLe0yeGXmXcOqpRQeFZKJnvFs0GlGkF1uBkjWmbD3W2_8M7LipLkctLrnYEltQRYQ2vVdmyrwc8IOQ3foBp3x4Nu_BwumZ9NqFL0OMTfQtyn7A8MBa1KBxIBoXXxU-cjV',
  //   notification: {
  //     title: 'Testing',
  //     body: '{"Message from node js app"}',
  //   },

  // data: { // you can send only notification or only data(or include both)
  //   title: 'ok cdfsdsdfsd',
  //   body: '{"name" : "okg ooggle ogrlrl","product_id" : "123","final_price" : "0.00035"}',
  // },
  fcm.send(notification, (err: any, response: any) => {
    if (err) {
      console.log(`Something has gone wrong!${err}`);
      console.log(`Respponse:! ${response}`);
    } else {
      // showToast("Successfully sent with response");
      console.log('Successfully sent with response: ', response);
    }
  });
};
