/* eslint-disable no-restricted-syntax */
/* eslint-disable unused-imports/no-unused-imports */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable camelcase */
/* eslint-disable no-unused-vars */
import dayjs from 'dayjs';
import 'dotenv/config';
import { MongoClient } from '../src/clients/mongo';
import { generateCommissionPayoutForUsers, generateCommissionPayoutOverview } from '../src/services/commission';

(async () => {
  try {
    await MongoClient.init();
    // await RedisClient.init();
    // await EmailBullClient.init();
    // await SendCreateAccountReminderEmails.oneTimeSend();
    // await generateCommissionPayoutForUsers(5);
    // await generateCommissionPayoutOverview(dayjs('2023-05-01T07:00:00.000+00:00').toDate());
    // await globalTransactionUpdates({ writeOutput: false });
  } catch (err) {
    console.log(err);
  } finally {
    MongoClient.disconnect();
  }
})();
