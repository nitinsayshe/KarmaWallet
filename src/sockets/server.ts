import { RedisAdapter } from '@socket.io/redis-adapter';
import http from 'http';
import { Namespace, Server } from 'socket.io';
import { AllowedOrigins, UserRoles } from '../lib/constants';
import identify from './middleware/identify';
import logger from './middleware/logger';
import { ISocket } from './types/request';
import router from './routers';
import protectedRequirements from './middleware/protected';

export class SocketServer {
  private _httpServer: http.Server;
  private _redisAdapter: (nsp: any) => RedisAdapter;
  private _socketServer: Server;
  private _main: Namespace;
  private _admin: Namespace;

  constructor(httpServer: http.Server, redisAdapter: (nsp: any) => RedisAdapter) {
    this._httpServer = httpServer;
    this._redisAdapter = redisAdapter;

    this._socketServer = new Server(this._httpServer, {
      cors: {
        origin: AllowedOrigins,
      },
    });

    this._main = this._socketServer.of('/');
    this._main.use(identify());
    this._main.use(logger);
    this._main.on('connect', (socket) => {
      router(socket as ISocket);
      console.log('main socket connected');
    });

    this._admin = this._socketServer.of('/karma');
    this._admin.use(identify());
    this._admin.use(protectedRequirements({ roles: [UserRoles.Admin, UserRoles.Member, UserRoles.SuperAdmin] }));
    this._admin.use(logger);
    this._admin.on('connect', (socket) => {
      router(socket as ISocket);
      console.log('admin socket connected');
    });
  }

  // takes an event name, a array of rooms, data
  // emit (msg: string) {
  //   this._namespace.emit(msg);
  // }

  // EXAMPLE FROM JOHN
  // emit({
  //   namespace = 'io', rooms, exclude, data, type, eventName,
  // }) {
  //   const controlledNamespace = Object.values(this.namespaces).find(nmsp => nmsp === namespace) || 'io';
  //   const controlledType = type || 'update';
  //   const controlledEvent = Object.values(SocketEvents).find(e => e === eventName) || 'topic';
  //   let io = this.get(controlledNamespace);
  //   if (!!rooms?.length) {
  //     for (let i = 0; i < rooms.length; i += 1) {
  //       io = io.to(rooms[i]);
  //     }
  //   }
  //   if (!!exclude?.length) {
  //     for (let i = 0; i < exclude.length; i += 1) {
  //       io = io.except(exclude[i]);
  //     }
  //   }
  //   io.emit(controlledEvent, { type: controlledType, data });
  // }
}
