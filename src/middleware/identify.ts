import { Request, Response, NextFunction } from 'express';
import { IUser } from '../mongo/model/user';
import * as Session from '../services/session';
import * as UserModel from '../services/user';
import { IRequest } from '../types/request';

const identify = async (req: Request, _: Response, next: NextFunction) => {
  const authKey = req.header('authKey');
  if (!authKey) return next();
  try {
    const uid = await Session.verifySession(authKey);
    if (uid) {
      const user = await UserModel.getUserById(req, uid, true);
      (req as IRequest).requestor = (user as IUser);
      (req as IRequest).authKey = authKey;
    }
  } catch (e) {
    return next();
  }
  return next();
};

export default identify;
