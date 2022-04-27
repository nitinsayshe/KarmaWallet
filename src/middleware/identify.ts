import { Request, Response, NextFunction } from 'express-serve-static-core';
import { isValidObjectId } from 'mongoose';
import { LegacySessionModel } from '../models/legacySession';
import { IUserDocument, UserModel } from '../models/user';
import * as UserService from '../services/user';
import * as Session from '../services/session';
import { IRequest } from '../types/request';

const identify = async (req: Request, _: Response, next: NextFunction) => {
  let authKey = req.header?.('authKey');

  if (!authKey && !!req.headers) {
    authKey = req.headers.authKey;
  }

  if (!authKey) return next();

  try {
    const isUserId = isValidObjectId(authKey);
    if (isUserId) {
      const uid = await Session.verifySession(authKey);
      if (uid) {
        const user = await UserService.getUserById(req, uid);
        (req as IRequest).requestor = (user as IUserDocument);
        (req as IRequest).authKey = authKey;
      }
    } else {
      const session = await LegacySessionModel.findOne({ authKey }).lean();
      if (session?.uid) {
        const user = await UserModel.findOne({ legacyId: session?.uid });
        (req as IRequest).requestor = user;
        (req as IRequest).authKey = authKey;
      }
    }
  } catch (e) {
    return next();
  }
  return next();
};

export default identify;
