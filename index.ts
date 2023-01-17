import 'dotenv/config';
import express from 'express';
import pino from 'pino-http';
import helmet from 'helmet';
import process from 'process';
import compression from 'compression';
import { EventEmitter } from 'events';
import { MongoClient } from './src/clients/mongo';
import { RedisClient } from './src/clients/redis';
import cors from './src/middleware/cors';
import checkToken from './src/middleware/checkToken';
import identify from './src/middleware/identify';
import rateLimiter from './src/middleware/rateLimiter';
import errorHandler from './src/middleware/errorHandler';
import { SocketClient } from './src/clients/socket';
import routers from './src/routers';
import { MainBullClient } from './src/clients/bull/main';
import { EmailBullClient } from './src/clients/bull/email';

EventEmitter.defaultMaxListeners = 50;

const port = process.env.PORT || 8012;

(async () => {
  const app = express();
  await MongoClient.init();
  await RedisClient.init();
  await MainBullClient.init();
  await EmailBullClient.init();
  app.use(compression());
  app.use(helmet() as any); // temp workaround for broken types with express typings
  app.use(cors());
  app.use(pino() as any); // temp workaround for broken types with express typings
  app.use(checkToken);
  app.use(identify);
  app.use(express.urlencoded({ extended: true }) as any); // temp workaround for broken types with express typings
  app.use(express.json({ limit: `${100 * 1024 * 1024}mb` }) as any); // temp workaround for broken types with express typings { limit: `${100 * 1024 * 1024}mb` }
  app.use(await rateLimiter({ keyPrefix: 'main-middleware' }));

  const httpServer = app.listen(port, () => {
    console.log('\n --------------------------\n', `| Listening on port ${port} |`, '\n --------------------------');
    console.log(' --------------------------\n', `|   Process id ${process.pid}     |`, '\n --------------------------\n');
  });
  SocketClient.init(httpServer);
  routers(app);
  app.use(errorHandler);
})();
