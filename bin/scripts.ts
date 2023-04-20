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
import { PaypalClient } from '../src/clients/paypal';
import { getCurrentWildfireData } from '../src/services/scripts/wildfire';

dayjs.extend(utc);

const paypalFormattedPayouts: any = [
  {
    recipient_type: 'PAYPAL_ID',
    amount: {
      value: '.03',
      currency: 'USD',
    },
    receiver: '6X3V82FPNJKX8',
    // need to update this text
    note: 'TEST - Karma Wallet Cashback Payout - Thank you for using Karma Wallet!',
    sender_item_id: 'test-payout-1',
  },
];
// this is set to send one at a time instead of lumping them all together, should we send it all at once?
const sendPayoutHeader: any = {
  sender_batch_header: {
    sender_batch_id: 'test-payout-1',
    email_subject: 'You\'ve received a payout from Karma Wallet!',
    email_message: 'Your payout for Karma Wallet is on its way.',
  },
};

(async () => {
  try {
    await MongoClient.init();
    await generateCommissionPayoutOverview(dayjs('2023-05-01T07:00:00.000+00:00').toDate());
  } catch (err) {
    Logger.error(asCustomError(err));
    console.log(err);
  } finally {
    MongoClient.disconnect();
  }
})();
