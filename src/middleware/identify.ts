import { Request, Response, NextFunction } from 'express-serve-static-core';
import { IUserDocument } from '../models/user';
import * as Session from '../services/session';
import * as UserModel from '../services/user';
import { IRequest } from '../types/request';

const identify = async (req: Request, _: Response, next: NextFunction) => {
  let authKey = req.header?.('authKey');

  if (!authKey && !!req.headers) {
    authKey = req.headers.authKey;
  }

  if (!authKey) return next();
  try {
    const uid = await Session.verifySession(authKey);
    if (uid) {
      const user = await UserModel.getUserById(req, uid);
      (req as IRequest).requestor = (user as IUserDocument);
      (req as IRequest).authKey = authKey;
    }
  } catch (e) {
    return next();
  }
  return next();
};

export default identify;
