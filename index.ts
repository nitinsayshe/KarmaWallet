import 'dotenv/config';
import express from 'express';
import pino from 'pino-http';
import helmet from 'helmet';
import process from 'process';
import compression from 'compression';
import { MongoClient } from './src/clients/mongo';
import { RedisClient } from './src/clients/redis';
import cors from './src/middleware/cors';
import checkToken from './src/middleware/checkToken';
import identify from './src/middleware/identify';
import rateLimiter from './src/middleware/rateLimiter';
import errorHandler from './src/middleware/errorHandler';
import { SocketClient } from './src/clients/socket';
import routers from './src/routers';
import { RequestHandler } from 'express-serve-static-core';

const port = process.env.PORT || 8012;

(async () => {
  const app = express();
  await MongoClient.init();
  await RedisClient.init();
  app.use(compression());
  app.use(helmet() as any); // temp workaround for broken types with express typings
  app.use(cors());
  app.use(pino() as any); // temp workaround for broken types with express typings
  app.use(checkToken);
  app.use(identify);
  app.use(express.urlencoded() as any); // temp workaround for broken types with express typings
  app.use(express.json() as any); // temp workaround for broken types with express typings
  app.use(await rateLimiter({ keyPrefix: 'main-middleware' }));

  const httpServer = app.listen(port, () => {
    console.log('\n --------------------------\n', `| Listening on port ${port} |`, '\n --------------------------');
    console.log(' --------------------------\n', `|   Process id ${process.pid}     |`, '\n --------------------------\n');
  });
  SocketClient.init(httpServer);
  routers(app);
  app.use(errorHandler);
})();
