import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';

import { UserLogModel } from '../../models/userLog';
import { areMoreThanOneDayApart } from '../../lib/date';
import { IUserDocument, UserModel } from '../../models/user';
import * as UserUtilsService from '../../services/user/utils/index';
import * as Session from '../../services/session';
import { IRequest } from '../../types/request';
import { ErrorTypes } from '../../lib/constants';
import CustomError, { asCustomError } from '../../lib/customError';

const getUserById = async (id: string) => {
  try {
    const user = await UserModel.findById({ _id: id });

    if (!user) throw new CustomError('User not found', ErrorTypes.NOT_FOUND);

    return user;
  } catch (err) {
    throw asCustomError(err);
  }
};

export default () => async (socket: Socket, next: (err?: ExtendedError) => void) => {
  const authKey = socket.handshake?.auth?.token;

  if (!authKey) return next();

  try {
    const uid = await Session.verifySession(authKey);

    if (!uid) return next();

    if (uid) {
      const user = await getUserById(uid);
      (socket.request as unknown as IRequest).requestor = (user as IUserDocument);
      (socket.request as unknown as IRequest).authKey = authKey;

      const now = new Date();
      const latestUserLogin = await UserLogModel.findOne({ userId: user._id }).sort({ date: -1 });
      if (!latestUserLogin || !latestUserLogin.date || areMoreThanOneDayApart(latestUserLogin.date, now)) {
        await UserUtilsService.storeNewLogin(user._id.toString(), now, authKey);
      }
    }
  } catch (e) {
    return next();
  }
  return next();
};
