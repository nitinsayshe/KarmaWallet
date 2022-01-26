import { RedisAdapter } from '@socket.io/redis-adapter';
import http from 'http';
import { Namespace, Server } from 'socket.io';

export abstract class SocketServer {
  protected _httpServer: http.Server;
  protected _redisAdapter: (nsp: any) => RedisAdapter;
  protected _socketServer: Server;
  protected _namespace: Namespace;

  constructor(httpServer: http.Server, redisAdapter: (nsp: any) => RedisAdapter) {
    this._httpServer = httpServer;
    this._redisAdapter = redisAdapter;
  }

  abstract init(): void;

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
