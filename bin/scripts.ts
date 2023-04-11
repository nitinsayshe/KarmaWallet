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
import { generatePayoutSummaryForPeriod, getAllWildfireTotalCommissions, getReadyWildfireCommissioins } from '../src/services/scripts/commission_payouts';
import { getUsersWithRemovedCards } from '../src/services/scripts/users_with_removed_cards';

dayjs.extend(utc);

(async () => {
  try {
    await MongoClient.init();
    await getReadyWildfireCommissioins();
    await getAllWildfireTotalCommissions();
  } catch (err) {
    Logger.error(asCustomError(err));
    console.log(err);
  } finally {
    MongoClient.disconnect();
  }
})();
