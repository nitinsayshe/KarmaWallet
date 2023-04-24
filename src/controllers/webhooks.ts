/* eslint-disable camelcase */
import crypto from 'crypto';
import { mapTransactions } from '../integrations/rare';
import { api, error } from '../services/output';
import CustomError, { asCustomError } from '../lib/customError';
import { ErrorTypes } from '../lib/constants';
import { IRequestHandler } from '../types/request';
import { IRareTransaction } from '../integrations/rare/transaction';
import { MainBullClient } from '../clients/bull/main';
import { JobNames } from '../lib/constants/jobScheduler';
import { IGroupOffsetMatchData, matchMemberOffsets, getGroup } from '../services/groups';
import { IRareRelayedQueryParams } from '../integrations/rare/types';
import { Logger } from '../services/logger';
import { validateStatementList } from '../services/statements';
import { IStatementDocument } from '../models/statement';
import { UserModel } from '../models/user';
import * as UserPlaidTransactionMapJob from '../jobs/userPlaidTransactionMap';
import { _getCard } from '../services/card';
import { PlaidClient } from '../clients/plaid';
import { mapWildfireCommissionToKarmaCommission } from '../services/commission/utils';
import { WildfireCommissionStatus } from '../models/commissions';
import { PaypalClient } from '../clients/paypal';

const { KW_API_SERVICE_HEADER, KW_API_SERVICE_VALUE, WILDFIRE_CALLBACK_KEY } = process.env;

// these are query parameters that were sent
// from the karma frontend to the rare transactions
// page, and then rare is taking them and dropping
// then into the body of this request for us

interface IRareTransactionBody {
  transaction: IRareTransaction;
  forwarded_query_params?: IRareRelayedQueryParams;
}

interface IWildfireWebhookBody {
  ID: string,
  Type: string,
  Action: string,
  Payload: {
    CommissionID: number,
    ApplicationID: number,
    MerchantID: number,
    DeviceID: number,
    SaleAmount: {
      Amount: string,
      Currency: string,
    },
    Amount: {
      Amount: string,
      Currency: string,
    },
    Status: WildfireCommissionStatus,
    TrackingCode: string,
    EventDate: Date,
    CreatedDate: Date,
    ModifiedDate: Date,
    MerchantOrderID: string,
    MerchantSKU: string
    TC: string,
  },
  CreatedDate: string
}

interface IUserPlaidTransactionsMapBody {
  userId: string;
  accessToken: String
}

interface IPlaidWebhookBody {
  webhook_type: string;
  webhook_code: string;
  account_id: string;
  item_id: string;
  new_transactions?: number;
}

interface IPaypalRequestHeaders {
  'paypal-transmission-id': string;
  'paypal-transmission-time': string;
  'paypal-transmission-sig': string;
  'paypal-auth-version': string;
  'paypal-cert-url': string;
  'paypal-auth-algo': string;
  'content-type': string;
  'user-agent': string;
  'correlation-id': string;
  'x-b3-spanid': string;
}

interface IPaypalWebhookBody {
  any: any;
}

export const mapRareTransaction: IRequestHandler<{}, {}, IRareTransactionBody> = async (req, res) => {
  if (
    process.env.KW_ENV !== 'staging'
    && req.headers?.['rare-webhook-key'] !== 'KFVKe5584dBb6y22SSwePMPG8MaskwvSxr86tWYPT4R8WkG6JDbUcMGMBE838jQu'
  ) {
    return error(req, res, new CustomError('Access Denied', ErrorTypes.NOT_ALLOWED));
  }

  try {
    console.log('\n\n/////////////// RARE TRANSACTION ///////////////////////\n\n');
    console.log({ rareTransaction: JSON.stringify(req?.body) });

    const rareTransaction = req?.body?.transaction;
    const uid = rareTransaction?.user?.external_id;
    const { groupId, statementIds } = (req.body.forwarded_query_params || {});

    let group;
    if (groupId) {
      try {
        const mockRequest = { ...req };
        mockRequest.params = {
          ...mockRequest.params,
          groupId,
        };
        group = await getGroup(mockRequest);
      } catch (e) {
        Logger.error(asCustomError(e));
      }
    }

    let statements: IStatementDocument[] = [];
    if (statementIds) {
      try {
        const { APP_USER_ID } = process.env;
        if (!APP_USER_ID) throw new CustomError('AppUserId not found', ErrorTypes.SERVICE);
        const appUser = await UserModel.findOne({ _id: APP_USER_ID });
        req.requestor = appUser;
        const statementIdsArray = statementIds?.split(',');
        statements = await validateStatementList(req, statementIdsArray, group);
      } catch (e) {
        Logger.error(asCustomError(e));
      }
    }
    const isMatch = statements.length > 0;
    await mapTransactions([rareTransaction], isMatch, group);

    if (!!statementIds) {
      const matchStatementData: IGroupOffsetMatchData = {
        group,
        statements,
        totalAmountMatched: rareTransaction.amt,
        transactor: { user: uid, group },
      };
      await matchMemberOffsets(req, matchStatementData);
      // TODO: send socket event notifying user of matches being successfully applied.
    }

    api(req, res, { message: 'KarmaWallet/Rare transaction processed successfully.' });
  } catch (e) {
    console.log('\n\n/////////////// RARE WEBHOOK ERROR ///////////////////////\n\n');
    error(req, res, asCustomError(e));
  }
};

export const userPlaidTransactionsMap: IRequestHandler<{}, {}, IUserPlaidTransactionsMapBody> = async (req, res) => {
  if (req.headers?.[KW_API_SERVICE_HEADER] !== KW_API_SERVICE_VALUE) return error(req, res, new CustomError('Access Denied', ErrorTypes.NOT_ALLOWED));
  try {
    const { userId, accessToken } = req.body;
    MainBullClient.createJob(JobNames.UserPlaidTransactionMapper, { userId, accessToken }, null, { onComplete: UserPlaidTransactionMapJob.onComplete });
    api(req, res, { message: `${JobNames.UserPlaidTransactionMapper} added to queue` });
  } catch (e) {
    error(req, res, asCustomError(e));
  }
};

export const handlePlaidWebhook: IRequestHandler<{}, {}, IPlaidWebhookBody> = async (req, res) => {
  try {
    const signedJwt = req.headers?.['plaid-verification'];
    const client = new PlaidClient();
    await client.verifyWebhook({ signedJwt, requestBody: req.body });
    const { webhook_type, webhook_code, item_id } = req.body;
    // Historical Transactions Ready
    if (webhook_code === 'HISTORICAL_UPDATE' && webhook_type === 'TRANSACTIONS') {
      const card = await _getCard({ 'integrations.plaid.items': item_id });
      if (!card) throw new CustomError(`Card with item_id of ${item_id} not found`, ErrorTypes.NOT_FOUND);
      MainBullClient.createJob(JobNames.UserPlaidTransactionMapper, { userId: card.userId, accessToken: card.integrations.plaid.accessToken }, null, { onComplete: UserPlaidTransactionMapJob.onComplete });
    }
    api(req, res, { message: 'Plaid webhook processed successfully.' });
  } catch (e) {
    error(req, res, asCustomError(e));
  }
};

export const handleWildfireWebhook: IRequestHandler<{}, {}, IWildfireWebhookBody> = async (req, res) => {
  try {
    const { body } = req;
    const wildfireSignature = req?.headers['x-wf-signature']?.replace('sha256=', '');
    const bodyHash = crypto.createHmac('SHA256', WILDFIRE_CALLBACK_KEY).update(JSON.stringify(body)).digest('hex');
    try {
      if (!crypto.timingSafeEqual(Buffer.from(bodyHash), Buffer.from(wildfireSignature))) throw new CustomError('Access denied', ErrorTypes.NOT_ALLOWED);
      // do work here
      console.log('Wildfire webhook processed successfully.');
      console.log('------- BEG WF Transaction -------\n');
      console.log(JSON.stringify(body, null, 2));
      console.log('\n------- END WF Transaction -------');
      try {
        await mapWildfireCommissionToKarmaCommission(body.Payload);
      } catch (e) {
        console.log('Error mapping wildfire commission to karma commission');
        console.log(e);
        return error(req, res, new CustomError('Error mapping wildfire commission to karma commission', ErrorTypes.SERVICE));
      }
      api(req, res, { message: 'Wildfire comission processed successfully.' });
    } catch (e) {
      throw new CustomError('Access denied', ErrorTypes.NOT_ALLOWED);
    }
  } catch (e) {
    error(req, res, asCustomError(e));
  }
};

const processPaypalWebhook = async (body: any) => {
  console.log('Paypal webhook processed successfully.');
  console.log('------- BEG Paypal Transaction -------\n');
  console.log(JSON.stringify(body, null, 2));
};

export const handlePaypalWebhook: IRequestHandler<{}, {}, IPaypalWebhookBody> = async (req, res) => {
  const { headers } = <{ headers: IPaypalRequestHeaders }>req;
  const client = new PaypalClient();
  console.log('------- BEG Paypal Webhook Headers -------\n');
  console.log(JSON.stringify(headers, null, 2));
  console.log('\n------- END Paypal Webhook Headers -------');
  console.log('------- BEG Paypal Webhook BODY -------\n');
  console.log(JSON.stringify(req.body, null, 2));
  console.log('------- END Paypal Webhook BODY -------\n');
  const verification = await client.verifyWebhookSignature({
    auth_algo: headers['paypal-auth-algo'],
    cert_url: headers['paypal-cert-url'],
    transmission_id: headers['paypal-transmission-id'],
    transmission_sig: headers['paypal-transmission-sig'],
    transmission_time: headers['paypal-transmission-time'],
    webhook_id: process.env.PAYPAL_WEBHOOK_ID,
    webhook_event: req.body,
  });
  if (!verification) throw new CustomError('Paypal webhook verification failed', ErrorTypes.GEN);
  processPaypalWebhook(req.body);
  api(req, res, { message: 'Paypal webhook processed successfully.' });
};
