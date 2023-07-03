import { Request, Response, NextFunction } from 'express-serve-static-core';
import { LegacySessionModel } from '../models/legacySession';
import { IUserDocument, UserModel } from '../models/user';
import * as UserService from '../services/user';
import * as Session from '../services/session';
import { UserLogModel } from '../models/userLog';
import { IRequest } from '../types/request';
import { areMoreThanOneDayApart, getUtcDate } from '../lib/date';

const identify = async (req: Request, _: Response, next: NextFunction) => {
  let authKey = req.header?.('authKey');

  if (!authKey && !!req.headers) {
    authKey = req.headers.authKey;
  }

  if (!authKey) return next();

  try {
    const uid = await Session.verifySession(authKey);
    const session = await LegacySessionModel.findOne({ authKey }).lean();
    console.log('uid', uid, ':::session', session);
    if (!uid && !session) return next();

    if (session?.uid) {
      const user = await UserModel.findOne({ legacyId: session?.uid });
      (req as IRequest).requestor = user;
      (req as IRequest).authKey = authKey;
    }

    if (uid) {
      const user = await UserService.getUserById(req, uid);
      (req as IRequest).requestor = user as IUserDocument;
      (req as IRequest).authKey = authKey;

      const now = getUtcDate().toDate();
      const latestUserLogin = await UserLogModel.findOne({ userId: user._id }).sort({ date: -1 });
      if (!latestUserLogin || !latestUserLogin.date || areMoreThanOneDayApart(latestUserLogin.date, now)) {
        await UserService.storeNewLogin(user._id.toString(), now);
      }
    }
  } catch (e) {
    return next();
  }
  return next();
};

export default identify;
