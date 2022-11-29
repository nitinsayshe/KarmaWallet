/* eslint-disable unused-imports/no-unused-imports */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable camelcase */
/* eslint-disable no-unused-vars */
import 'dotenv/config';
import { K } from 'handlebars';
import { MongoClient } from '../src/clients/mongo';
import { asCustomError } from '../src/lib/customError';
import { Logger } from '../src/services/logger';
import { manuallyUpdateTransactionsFalsePositiveNegatives } from '../src/services/scripts/update_false_positive_negatives_transactions';
import { calculateAvgScores } from '../src/services/scripts/calculate_avg_sector_scores';
import { checkCompanySectorsForMainTierSector } from '../src/services/scripts/check_company_sectors_for_main_tier_sector';
import { singleBatchMatch } from '../src/services/scripts/match-existing-transactions';
import * as GenerateUserImpactTotals from '../src/jobs/generateUserImpactTotals';
import { removeDuplicatePlaidTransactions } from '../src/services/scripts/remove_duplicate_plaid_transactions';
import { CompanyDataSourceModel } from '../src/models/companyDataSource';
import { monthlyBatchUpdateEffects } from '../src/services/scripts/monthly_batch_update_effects';
import { PaypalClient } from '../src/clients/paypal';
import { getUsersWithCommissionsForPayout } from '../src/services/commission';

const BATCH_SIZE = 50000;

(async () => {
  try {
    // const mockRequest = ({
    //   requestor: { },
    //   authKey: '',
    // } as IRequest);
    await MongoClient.init();
    const client = new PaypalClient();
    // const accessToken = await client.getClientAccessToken();
    // const data = await client.sendPayout(
    //   {
    //     sender_batch_header: {
    //       sender_batch_id: 'batch_1',
    //       email_subject: 'You have a payment', // Cashback payout
    //       email_message: 'You have received a payment', // more refined message
    //     } },
    //   [
    //     {
    //       recipient_type: 'PAYPAL_ID',
    //       amount: {
    //         value: '1.00',
    //         currency: 'USD',
    //       },
    //       receiver: 'QRM44WQFN54TN', // paypalId
    //       note: 'customized message for user with date/amount/commissions maybe?',
    //       sender_item_id: 'payoutIdInDB',
    //     },
    //   ],
    // );
    const data = await getUsersWithCommissionsForPayout(new Date('2022-09-29'));
    console.log(JSON.stringify(data, null, 2));
    await MongoClient.disconnect();
  } catch (err) {
    Logger.error(asCustomError(err));
    console.log(err);
    // await MongoClient.disconnect();
  }
})();
