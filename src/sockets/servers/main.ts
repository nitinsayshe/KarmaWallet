import { Server } from 'socket.io';
import { AllowedOrigins } from '../../lib/constants';
import identify from '../middleware/identify';
import logger from '../middleware/logger';
import router from '../routers';
import { ISocket } from '../types/request';
import { SocketServer } from './base';

export class MainSocketServer extends SocketServer {
  init = () => {
    this._socketServer = new Server(this._httpServer, {
      cors: {
        origin: AllowedOrigins,
      },
    });

    this._namespace = this._socketServer.of('/');
    this._namespace.use(identify());
    this._namespace.use(logger);
    this._namespace.on('connect', (socket) => {
      router(socket as ISocket);
      console.log('Main socket connected');
    });
  };
}
