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
import { generateCommissionPayoutForUsers, generateCommissionPayoutOverview, sendCommissionPayoutsThruPaypal } from '../src/services/commission';

dayjs.extend(utc);

(async () => {
  try {
    await MongoClient.init();
    // await generateCommissionPayoutForUsers(5);
    // await generateCommissionPayoutOverview(dayjs('2023-05-01T00:00:00.000+00:00').toDate());
    await generatePayoutSummaryForPeriod(5);
  } catch (err) {
    Logger.error(asCustomError(err));
    console.log(err);
  } finally {
    MongoClient.disconnect();
  }
})();
