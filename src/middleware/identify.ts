import { Request, Response, NextFunction } from 'express-serve-static-core';
import { API_V2_SERVICE_NAME, SERVICE_NAME_HEADER } from '../lib/constants';
import { LegacySessionModel } from '../models/legacySession';
import { IUserDocument, UserModel } from '../models/user';
import * as UserService from '../services/user';
import * as Session from '../services/session';
import { IRequest } from '../types/request';

const identify = async (req: Request, _: Response, next: NextFunction) => {
  if (req.header?.(SERVICE_NAME_HEADER) === API_V2_SERVICE_NAME) {
    // THIS IS A REQUEST FROM THE LEGACY API AND
    // SHOULD USE LEGACY IDS, NOT UPDATED IDS
    //
    // TODO: DELETE THIS ENTIRE IF STATEMENT ONCE THE
    //  LEGACY API IS NO LONGER BEING USED.
    const authKey = req.header('authKey');
    if (!authKey) return next();
    try {
      const session = await LegacySessionModel.findOne({ authKey }).lean();
      if (session?.uid) {
        const user = await UserModel.findOne({ legacyId: session?.uid });
        (req as IRequest).requestor = user;
        (req as IRequest).authKey = authKey;
      }
      return next();
    } catch (e) {
      return next();
    }
  }

  let authKey = req.header?.('authKey');

  if (!authKey && !!req.headers) {
    authKey = req.headers.authKey;
  }

  if (!authKey) return next();
  try {
    const uid = await Session.verifySession(authKey);
    if (uid) {
      const user = await UserService.getUserById(req, uid);
      (req as IRequest).requestor = (user as IUserDocument);
      (req as IRequest).authKey = authKey;
    }
  } catch (e) {
    return next();
  }
  return next();
};

export default identify;
