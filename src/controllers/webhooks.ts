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
    ID: number,
    ApplicationID: number,
    MerchantID: number,
    DeviceID: number,
    SaleAmount: string,
    Amount: string,
    Status: string,
    TrackingCode: string,
    EventDate: string,
    CreatedDate: string,
    ModifiedDate: string,
    MerchantOrderID: string,
    MerchantSKU: string

  },
  CreatedDate: string
}

interface IUserPlaidTransactionsMapBody {
  userId: String;
  accessToken: String
}

interface IPlaidWebhookBody {
  webhook_type: string;
  webhook_code: string;
  account_id: string;
  item_id: string;
  new_transactions?: number;
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
    const { statementIds, groupId } = (req.body.forwarded_query_params || {});

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
        // if only 1 statement id is received, shows up as a string
        const { APP_USER_ID } = process.env;
        if (!APP_USER_ID) throw new CustomError('AppUserId not found', ErrorTypes.SERVICE);
        const appUser = await UserModel.findOne({ _id: APP_USER_ID });
        req.requestor = appUser;
        statements = await validateStatementList(req, typeof statementIds === 'string' ? [statementIds] : statementIds, group);
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
    const { body, headers } = req;
    const wildfireSignature = headers['X-Wf-Signature'];
    const bodyHash = crypto.createHmac('SHA256', WILDFIRE_CALLBACK_KEY).update(JSON.stringify(body)).digest('hex');
    console.log({
      wildfireSignature,
      bodyHash,
    });
    if (!crypto.timingSafeEqual(Buffer.from(bodyHash), Buffer.from(wildfireSignature))) throw new CustomError('Access denied', ErrorTypes.NOT_ALLOWED);
    console.log('wf check has passed. callback body: ', body);
  } catch (e) {
    error(req, res, asCustomError(e));
  }
};

// wildfireSignature = c8abc5baf0a109d3365f90b1f783a9f71eaecd1746fcf39b9b4b1b3417b84cca // body encrypted with stored WFCBKey in PADMIN from SHA256 algo
// bodyHash = c8abc5baf0a109d3365f90b1f783a9f71eaecd1746fcf39b9b4b1b3417b84cca // body encrypted with WILDFIRE_CALLBACK_KEY in .env from SHA256 algo
