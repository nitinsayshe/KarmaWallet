import http from 'http';
import { Socket } from 'socket.io';
import { IUser } from '../../mongo/model/user';

export interface ISocketIncomingMessage extends http.IncomingMessage {
  requestor: IUser;
  authKey: string;
}

export interface ISocket extends Socket {
  request: ISocketIncomingMessage;
}
