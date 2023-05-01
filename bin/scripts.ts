/* eslint-disable no-restricted-syntax */
/* eslint-disable unused-imports/no-unused-imports */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable camelcase */
/* eslint-disable no-unused-vars */
import 'dotenv/config';
import { MongoClient } from '../src/clients/mongo';
import { generateMonthlyImpactReportForUser } from '../src/jobs/userMonthlyImpactReports';
import { asCustomError } from '../src/lib/customError';
import { Logger } from '../src/services/logger';
import { generatePayoutSummaryForPeriod, getAllWildfireTotalCommissions, getReadyWildfireCommissioins } from '../src/services/scripts/commission_payouts';
import { getUsersWithRemovedCards } from '../src/services/scripts/users_with_removed_cards';
import { generateCommissionPayoutForUsers, generateCommissionPayoutOverview, sendCommissionPayoutsThruPaypal } from '../src/services/commission';
import { PaypalClient } from '../src/clients/paypal';
import { getCurrentWildfireData } from '../src/services/scripts/wildfire';
import * as UserMonthlyImpactReports from '../src/jobs/userMonthlyImpactReports';
import { globalPlaidTransactionMapping } from '../src/services/scripts/global_plaid_transaction_mapping';
import { globalTransactionUpdates } from '../src/services/scripts/global_transaction_updates';
import { EmailBullClient } from '../src/clients/bull/email';
import { CommissionPayoutOverviewModel } from '../src/models/commissionPayoutOverview';
import { CommissionPayoutModel, KarmaCommissionPayoutStatus } from '../src/models/commissionPayout';
import * as SendCreateAccountReminderEmails from '../src/jobs/sendCreateAccountReminderEmail';
import { RedisClient } from '../src/clients/redis';
import { CommissionModel, KarmaCommissionStatus } from '../src/models/commissions';

(async () => {
  try {
    await MongoClient.init();
    // await RedisClient.init();
    // await EmailBullClient.init();
    // await SendCreateAccountReminderEmails.oneTimeSend();
    await generateCommissionPayoutForUsers(5);
    await generateCommissionPayoutOverview(dayjs('2023-05-01T07:00:00.000+00:00').toDate());
    // await globalTransactionUpdates({ writeOutput: false });
  } catch (err) {
    console.log(err);
  } finally {
    MongoClient.disconnect();
  }
})();
