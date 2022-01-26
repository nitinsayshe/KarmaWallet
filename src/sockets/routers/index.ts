import { ISocket } from '../types/request';
import room from './room';
import user from './user';

export default (socket: ISocket) => {
  room(socket);
  user(socket);
};
