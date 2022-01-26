import { IUser } from '../mongo/model/user';
import * as Session from '../services/session';
import * as UserModel from '../services/user';
import { IRequestHandler } from '../types/request';

const identify: IRequestHandler = async (req, _, next) => {
  const authKey = req.header('authKey');
  if (!authKey) return next();
  try {
    const uid = await Session.verify(authKey);
    if (uid) {
      const user = await UserModel.findById(req, uid, true);
      req.requestor = (user as IUser);
      req.authKey = authKey;
    }
  } catch (e) {
    return next();
  }
  return next();
};

export default identify;
