/* eslint-disable max-classes-per-file */
import { createAdapter, RedisAdapter } from '@socket.io/redis-adapter';
import http from 'http';
import { RedisClient } from '../clients/redis';
import { SocketServer } from './server';

export class SocketClient {
  private _socket: SocketServer = null;
  private _redisAdapter: (nsp: any) => RedisAdapter = null;

  get socket() { return this._socket; }

  init = (httpServer: http.Server) => {
    this._redisAdapter = createAdapter(RedisClient.pub, RedisClient.sub);
    this._socket = new SocketServer(httpServer, this._redisAdapter);
  };
}
