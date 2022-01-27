import * as Session from '../../services/session';
import * as User from '../../services/user';
import { IRequest } from '../../types/request';
import { ISocket } from '../types/request';

interface ISocketRequestData {
  authKey: string;
}

export const login = (socket: ISocket) => async ({ authKey }: ISocketRequestData) => {
  if (!authKey) return;
  const uid = await Session.verifySession(authKey);
  if (uid) {
    const user = await User.getUser(({} as IRequest), { _id: uid });
    socket.data.requestor = user;
    socket.data.authKey = authKey;
  }
};

export const logout = (socket: ISocket) => async () => {
  // leave all rooms
  // remove socket.data.requestor
  console.log('logout event received', socket);
};
