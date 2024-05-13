import 'dotenv/config';
import express from 'express';
import pino from 'pino-http';
import helmet from 'helmet';
import process from 'process';
import compression from 'compression';
import { EventEmitter } from 'events';
import { IncomingMessage } from 'http';
import { MongoClient } from './src/clients/mongo';
import { RedisClient } from './src/clients/redis';
import cors from './src/middleware/cors';
import checkToken from './src/middleware/checkToken';
import identify from './src/middleware/identify';
import { emailRateLimiter, KWRateLimiterKeyPrefixes, rateLimiter } from './src/middleware/rateLimiter';
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
  app.use(checkToken as any);
  app.use(identify);
  app.use(express.urlencoded({ extended: true }) as any); // temp workaround for broken types with express typings
  app.use(express.json({ limit: `${100 * 1024 * 1024}mb`, verify: (req: IncomingMessage & {rawBody: Buffer}, res, buf) => { req.rawBody = buf; } }) as any); // temp workaround for broken types with express typings { limit: `${100 * 1024 * 1024}mb` }
  app.use(await rateLimiter({ keyPrefix: KWRateLimiterKeyPrefixes.Main }) as any);

  const httpServer = app.listen(port, () => {
    console.log('\n --------------------------\n', `| Listening on port ${port} |`, '\n --------------------------');
    console.log(
      ' --------------------------\n',
      `|   Process id ${process.pid}     |`,
      '\n --------------------------\n',
    );
  });
  SocketClient.init(httpServer);
  app.use(errorHandler);

  // create endpoint rate limiters
  app.set(
    KWRateLimiterKeyPrefixes.ResetPasswordTokenCreate,
    await emailRateLimiter({ keyPrefix: KWRateLimiterKeyPrefixes.ResetPasswordTokenCreate }, app),
  );
  app.set(KWRateLimiterKeyPrefixes.Login, await emailRateLimiter({ keyPrefix: KWRateLimiterKeyPrefixes.Login }, app));
  app.set(KWRateLimiterKeyPrefixes.DefaultEmailLimiter, await emailRateLimiter({ keyPrefix: KWRateLimiterKeyPrefixes.DefaultEmailLimiter }, app));

  routers(app);
})();
