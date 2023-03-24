/* eslint-disable unused-imports/no-unused-imports */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable camelcase */
/* eslint-disable no-unused-vars */
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import 'dotenv/config';
import { MongoClient } from '../src/clients/mongo';
import { asCustomError } from '../src/lib/customError';
import { Logger } from '../src/services/logger';

dayjs.extend(utc);

(async () => {
  try {
    await MongoClient.init();
  } catch (err) {
    Logger.error(asCustomError(err));
    console.log(err);
  } finally {
    MongoClient.disconnect();
  }
})();
