import argon2 from 'argon2';
import { ErrorTypes } from '../../lib/constants';
import CustomError from '../../lib/customError';
import { getUtcDate } from '../../lib/date';
import { UserModel } from '../../models/user';
import { IRequest } from '../../types/request';
import * as Session from '../session';
import { ILoginData } from './types';
import { verifyBiometric } from './verification';
import { storeNewLogin, addFCMAndDeviceInfo } from '.';

export const login = async (req: IRequest, { email, password, biometricSignature, fcmToken, deviceInfo }: ILoginData) => {
  email = email?.toLowerCase();
  const user = await UserModel.findOne({ emails: { $elemMatch: { email, primary: true } } });
  if (!user) {
    throw new CustomError('Invalid email or password', ErrorTypes.INVALID_ARG);
  }

  if (biometricSignature) {
    const { identifierKey } = req;
    const { biometrics } = user.integrations;
    // get the publicKey to verify the signature
    const { biometricKey } = biometrics.find(biometric => biometric._id.toString() === identifierKey);
    const isVerified = await verifyBiometric(email, biometricSignature, biometricKey);
    if (!isVerified) {
      throw new CustomError('invalid biometricKey', ErrorTypes.INVALID_ARG);
    }
  } else {
    const passwordMatch = await argon2.verify(user.password, password);
    if (!passwordMatch) {
      throw new CustomError('Invalid email or password', ErrorTypes.INVALID_ARG);
    }
  }

  const authKey = await Session.createSession(user._id.toString());

  await storeNewLogin(user._id.toString(), getUtcDate().toDate(), authKey);
  if (fcmToken && deviceInfo) {
    await addFCMAndDeviceInfo(user, fcmToken, deviceInfo);
  }

  // await openBrowserAndAddShareASaleCode(user);
  return { user, authKey };
};
