import 'dotenv/config';
import path from 'path';
import os from 'os';
import express from 'express';
import pino from 'pino-http';
import process from 'process';
import compression from 'compression';
import { EventEmitter } from 'events';
import { MongoClient } from './src/clients/mongo';
import cors from './src/middleware/cors';
import errorHandler from './src/middleware/errorHandler';
import routers from './src/routers/frontend';
import { sendDefaultHtml } from './src/services/frontend_output';

EventEmitter.defaultMaxListeners = 50;

const {
  FRONT_END_PORT,
  FRONT_END_BUILD_PATH,
  NODE_ENV,
} = process.env;

const homePath = NODE_ENV === 'production' ? path.join(os.homedir(), ...FRONT_END_BUILD_PATH.split(',')) : FRONT_END_BUILD_PATH;

(async () => {
  const app = express();
  await MongoClient.init();
  app.use(compression());
  app.use(cors());
  app.use(pino() as any); // temp workaround for broken types with express typings
  app.get('/', sendDefaultHtml);
  // @ts-ignore
  app.use(express.static(homePath));
  routers(app);
  app.use(errorHandler);
  app.listen(FRONT_END_PORT, () => {
    console.log('\n --------------------------------------\n', `| KW Frontend listening on port ${FRONT_END_PORT} |`, '\n --------------------------------------');
    console.log(' --------------------------------------\n', `|         Process id ${process.pid}            |`, '\n --------------------------------------\n');
  });
})();
