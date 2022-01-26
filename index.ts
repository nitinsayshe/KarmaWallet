import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
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

const port = process.env.PORT || 8012;

(async () => {
  const app = express();
  await MongoClient.init();
  await RedisClient.init();
  app.use(compression());
  app.use(helmet());
  app.use(cors());
  app.use(pino());
  app.use(checkToken);
  app.use(identify);
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());
  app.use(await rateLimiter({ keyPrefix: 'main-middleware' }));

  const httpServer = app.listen(port, () => {
    console.log('\n --------------------------\n', `| Listening on port ${port} |`, '\n --------------------------');
    console.log(' --------------------------\n', `|   Process id ${process.pid}     |`, '\n --------------------------\n');
  });
  // socketServer(httpServer);
  // routers(app);
  // app.use(errorHandler);
})();
