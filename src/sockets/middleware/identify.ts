import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';

import { IUserDocument } from '../../models/user';
import * as UserService from '../../services/user';
import * as Session from '../../services/session';
import { mockRequest } from '../../lib/constants/request';
import { IRequest } from '../../types/request';

export default () => async (socket: Socket, next: (err?: ExtendedError) => void) => {
  const authKey = socket.handshake?.auth?.token;

  if (!authKey) return next();

  try {
    const uid = await Session.verifySession(authKey);

    if (!uid) return next();

    if (uid) {
      const _mockRequest = {
        ...mockRequest,
        requestor: { _id: uid } as IUserDocument,
      };

      const user = await UserService.getUserById(_mockRequest, uid);
      (socket.request as unknown as IRequest).requestor = (user as IUserDocument);
      (socket.request as unknown as IRequest).authKey = authKey;
    }
  } catch (e) {
    return next();
  }
  return next();
};
