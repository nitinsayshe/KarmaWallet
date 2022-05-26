import { RedisAdapter } from '@socket.io/redis-adapter';
import http from 'http';
import { BroadcastOperator, Namespace, Server } from 'socket.io';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { AllowedOrigins, SocketEvents, SocketNamespaces, UserRoles } from '../lib/constants';
import identify from './middleware/identify';
import logger from './middleware/logger';
import { ISocket } from './types/request';
import router from './routers';
import protectedRequirements from './middleware/protected';
import { SocketEventTypes } from '../lib/constants/sockets';

export interface ISocketEmitConfig {
  namespace?: SocketNamespaces;
  rooms?: string[];
  except?: string[];
  data?: any;
  type: SocketEventTypes;
  eventName?: SocketEvents,
}

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

    this._socketServer.adapter(this._redisAdapter);

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

  public emit({
    namespace = SocketNamespaces.Main,
    rooms,
    except = [],
    data,
    type,
    eventName = SocketEvents.Update,
  }: ISocketEmitConfig) {
    const _namespace = this._getNamespace(namespace);
    let _broadcastOperator: BroadcastOperator<DefaultEventsMap, any>;

    if (!!rooms?.length) _broadcastOperator = _namespace.to(rooms);
    if (!!except?.length) _broadcastOperator = _namespace.except(except);

    console.log('>>>>> namespace: ', _namespace);
    console.log('>>>>> broadcastOperator: ', _broadcastOperator);

    (_broadcastOperator || _namespace).emit(eventName, { type, data });
  }

  private _getNamespace = (namespace: string) => {
    switch (namespace) {
      case SocketNamespaces.Karma: return this._admin;
      default: return this._main;
    }
  };
}
