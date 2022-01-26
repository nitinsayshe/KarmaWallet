import { Server } from 'socket.io';
import { AllowedOrigins, UserRoles } from '../../lib/constants';
import protectedRequirements from '../middleware/protected';
import identify from '../middleware/identify';
import { SocketServer } from './base';
import logger from '../middleware/logger';
import router from '../routers';
import { ISocket } from '../types/request';

export class AdminSocketServer extends SocketServer {
  init = () => {
    this._socketServer = new Server(this._httpServer, {
      cors: {
        origin: AllowedOrigins,
      },
    });

    this._namespace = this._socketServer.of('/karma');
    this._namespace.use(identify());
    this._namespace.use(protectedRequirements({ roles: [UserRoles.Admin, UserRoles.Member, UserRoles.SuperAdmin] }));
    this._namespace.use(logger);
    this._namespace.on('connect', (socket) => {
      router(socket as ISocket);
      console.log('Main socket connected');
    });
  };
}
