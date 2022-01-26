/* eslint-disable max-classes-per-file */
import { createAdapter, RedisAdapter } from '@socket.io/redis-adapter';
import http from 'http';
import { RedisClient } from '../clients/redis';
import { MainSocketServer } from './servers/main';
import { AdminSocketServer } from './servers/admin';

export class SocketClient {
  private _admin: AdminSocketServer = null;
  private _main: MainSocketServer = null;
  private _redisAdapter: (nsp: any) => RedisAdapter = null;

  get admin() { return this._admin; }
  get main() { return this._main; }

  init = (httpServer: http.Server) => {
    this._redisAdapter = createAdapter(RedisClient.pub, RedisClient.sub);
    this._admin = new AdminSocketServer(httpServer, this._redisAdapter);
    this._main = new MainSocketServer(httpServer, this._redisAdapter);
    this._admin.init();
    this._main.init();
  };
}
