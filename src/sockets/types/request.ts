import http from 'http';
import { Socket } from 'socket.io';
import { IUserDocument } from '../../models/user';

export interface ISocketIncomingMessage extends http.IncomingMessage {
  requestor: IUserDocument;
  authKey: string;
}

export interface ISocket extends Socket {
  request: ISocketIncomingMessage;
}
