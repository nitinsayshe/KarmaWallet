import * as UserController from '../controllers/user';
import { ISocket } from '../types/request';

const path = 'user';

export const login = (socket: ISocket) => {
  socket.on(`${path}/login`, UserController.login(socket));
};

export const logout = (socket: ISocket) => {
  socket.on(`${path}/logout`, UserController.logout(socket));
};

export default (socket: ISocket) => {
  login(socket);
  logout(socket);
};
