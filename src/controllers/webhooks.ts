/* eslint-disable camelcase */
import crypto from 'crypto';
import { MainBullClient } from '../clients/bull/main';
import { PaypalClient } from '../clients/paypal';
import { PlaidClient } from '../clients/plaid';
import { processPaypalWebhook } from '../integrations/paypal';
import { mapTransactions } from '../integrations/rare';
import { IRareTransaction } from '../integrations/rare/transaction';
import { IRareRelayedQueryParams } from '../integrations/rare/types';
import * as UserPlaidTransactionMapJob from '../jobs/userPlaidTransactionMap';
import { ErrorTypes } from '../lib/constants';
import { JobNames } from '../lib/constants/jobScheduler';
import CustomError, { asCustomError } from '../lib/customError';
import { WildfireCommissionStatus } from '../models/commissions';
import { IStatementDocument } from '../models/statement';
import { UserModel } from '../models/user';
import { _getCard, handleMarqetaCardWebhook } from '../services/card';
import { mapWildfireCommissionToKarmaCommission, processKardWebhook } from '../services/commission/utils';
import { getGroup, IGroupOffsetMatchData, matchMemberOffsets } from '../services/groups';
import { Logger } from '../services/logger';
import { api, error } from '../services/output';
import { validateStatementList } from '../services/statements';
import { IRequestHandler } from '../types/request';
import { CardModel } from '../models/card';
import { ACHTransferModel } from '../models/achTransfer';
import * as output from '../services/output';
import { mapAndSaveMarqetaTransactionsToKarmaTransactions } from '../integrations/marqeta/transactions';
import { PushNotificationTypes } from '../lib/constants/notification';
import { createPushUserNotificationFromUserAndPushData } from '../services/user_notification';
import { handleDisputeMacros, mapAndSaveMarqetaChargebackTransitionsToChargebacks } from '../services/chargeback';
import { handleTransactionDisputeMacros, handleTransactionNotifications } from '../services/transaction';
import {
  IMarqetaWebhookBody,
  IMarqetaWebhookHeader,
  InsufficientFundsConstants,
  MarqetaWebhookConstants,
} from '../integrations/marqeta/types';
import { handleMarqetaUserTransitionWebhook } from '../services/user';
import { EarnedRewardWebhookBody, KardEnvironmentEnum, KardEnvironmentEnumValues, KardInvalidSignatureError } from '../clients/kard';
import { verifyAggregatorEnvWebhookSignature, verifyIssuerEnvWebhookSignature } from '../integrations/kard';

const { KW_API_SERVICE_HEADER, KW_API_SERVICE_VALUE, WILDFIRE_CALLBACK_KEY, MARQETA_WEBHOOK_ID, MARQETA_WEBHOOK_PASSWORD } = process.env;

// these are query parameters that were sent
// from the karma frontend to the rare transactions
// page, and then rare is taking them and dropping
// then into the body of this request for us

interface IRareTransactionBody {
  transaction: IRareTransaction;
  forwarded_query_params?: IRareRelayedQueryParams;
}

interface IWildfireWebhookBody {
  ID: string;
  Type: string;
  Action: string;
  Payload: {
    CommissionID: number;
    ApplicationID: number;
    MerchantID: number;
    DeviceID: number;
    SaleAmount: {
      Amount: string;
      Currency: string;
    };
    Amount: {
      Amount: string;
      Currency: string;
    };
    Status: WildfireCommissionStatus;
    TrackingCode: string;
    EventDate: Date;
    CreatedDate: Date;
    ModifiedDate: Date;
    MerchantOrderID: string;
    MerchantSKU: string;
    TC: string;
  };
  CreatedDate: string;
}

interface IUserPlaidTransactionsMapBody {
  userId: string;
  accessToken: string;
}

interface IPlaidWebhookBody {
  webhook_type: string;
  webhook_code: string;
  account_id: string;
  item_id: string;
  new_transactions?: number;
}

type KardRequestHeaders = {
  'notify-signature': string;
};

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

type IKardWebhookBody = EarnedRewardWebhookBody;

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
    const { groupId, statementIds } = req.body.forwarded_query_params || {};

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
  if (req.headers?.[KW_API_SERVICE_HEADER] !== KW_API_SERVICE_VALUE) {
    return error(req, res, new CustomError('Access Denied', ErrorTypes.NOT_ALLOWED));
  }
  try {
    const { userId, accessToken } = req.body;
    MainBullClient.createJob(JobNames.UserPlaidTransactionMapper, { userId, accessToken }, null, {
      onComplete: UserPlaidTransactionMapJob.onComplete,
    });
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
      MainBullClient.createJob(
        JobNames.UserPlaidTransactionMapper,
        { userId: card.userId, accessToken: card.integrations.plaid.accessToken },
        null,
        { onComplete: UserPlaidTransactionMapJob.onComplete },
      );
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
      if (!crypto.timingSafeEqual(Buffer.from(bodyHash), Buffer.from(wildfireSignature))) {
        throw new CustomError('Access denied', ErrorTypes.NOT_ALLOWED);
      }
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

export const handlePaypalWebhook: IRequestHandler<{}, {}, IPaypalWebhookBody> = async (req, res) => {
  try {
    const { headers } = <{ headers: IPaypalRequestHeaders }>req;
    const client = new PaypalClient();
    const verification = await client.verifyWebhookSignature({
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: process.env.PAYPAL_WEBHOOK_ID,
      webhook_event: req.body,
    });
    const eventId = (req.body as any).id;
    if (!verification) {
      console.log('\n PAYPAL WEBHOOK VERIFICATION FAILED \n');
      console.log(`Event ID: ${eventId}`);
      return error(req, res, new CustomError('Paypal webhook verification failed.', ErrorTypes.NOT_ALLOWED));
    }
    processPaypalWebhook(req.body);
    api(req, res, { message: 'Paypal webhook processed successfully.' });
  } catch (e) {
    error(req, res, asCustomError(e));
  }
};

export const handleKardWebhook: IRequestHandler<{}, {}, IKardWebhookBody> = async (req, res) => {
  try {
    const { headers } = <{ headers: KardRequestHeaders }>req;

    const eventId = (req.body as any).id;
    if (!headers['notify-signature']) {
      console.log('\n KARD WEBHOOK: Authentication Failed \n');
      console.log(`Event ID: ${eventId}`);
      return error(req, res, new CustomError('A token is required for authentication', ErrorTypes.FORBIDDEN));
    }
    let kardEnv: KardEnvironmentEnumValues = '';

    const errorVerifyingAggregatorEnvSignature = await verifyAggregatorEnvWebhookSignature(req.body, headers['notify-signature']);
    const errorVerifyingIssuerEnvSignature = await verifyIssuerEnvWebhookSignature(req.body, headers['notify-signature']);

    if (errorVerifyingIssuerEnvSignature && errorVerifyingAggregatorEnvSignature) {
      if (
        errorVerifyingIssuerEnvSignature === KardInvalidSignatureError
        || errorVerifyingAggregatorEnvSignature === KardInvalidSignatureError
      ) {
        console.log('\n KARD WEBHOOK: Invalid Token Provided \n');
        console.log(`Event ID: ${eventId}`);
        return error(req, res, new CustomError('Kard webhook verification failed.', ErrorTypes.AUTHENTICATION));
      }
      console.log('\n KARD WEBHOOK: Bad Request \n');
      console.log(`Event ID: ${eventId}`);
      return error(req, res, new CustomError('Kard webhook verification failed.', ErrorTypes.GEN));
    }
    kardEnv = !!errorVerifyingAggregatorEnvSignature ? KardEnvironmentEnum.Issuer : KardEnvironmentEnum.Aggregator;

    const processingError = await processKardWebhook(kardEnv, req.body);
    if (!!processingError) {
      return error(req, res, processingError);
    }

    api(req, res, { message: 'Kard webhook processed successfully.' });
  } catch (e) {
    error(req, res, asCustomError(e));
  }
};

export const handleMarqetaWebhook: IRequestHandler<{}, {}, IMarqetaWebhookBody> = async (req, res) => {
  try {
    console.log('////////// RECEIVED MARQETA WEBHOOK ////////// ');
    const marqetaAuthBuffer = Buffer.from(`${MARQETA_WEBHOOK_ID}:${MARQETA_WEBHOOK_PASSWORD}`).toString('base64');
    const { headers } = <{ headers: IMarqetaWebhookHeader }>req;

    if (headers?.authorization !== `Basic ${marqetaAuthBuffer}`) {
      return error(req, res, new CustomError('Access Denied', ErrorTypes.NOT_ALLOWED));
    }

    const { cards, cardactions, chargebacktransitions, usertransitions, banktransfertransitions, transactions } = req.body;

    // Card transition events include activities such as a card being activated/deactivated, ordered, or shipped
    if (!!cards) {
      console.log('////////// PROCESSING MARQETA CARD WEBHOOK ////////// ');
      for (const card of cards) {
        await handleMarqetaCardWebhook(card);
      }
    }

    // Card action events include PIN set, PIN change, and PIN reveal actions
    if (!!cardactions) {
      console.log('////////// PROCESSING MARQETA CARD ACTION WEBHOOK ////////// ');
      for (const cardaction of cardactions) {
        if (cardaction.type === MarqetaWebhookConstants.PIN_SET) {
          await CardModel.findOneAndUpdate(
            { 'integrations.marqeta.card_token': cardaction?.card_token },
            { 'integrations.marqeta.pin_is_set': true },
            { new: true },
          );
        }
      }
    }

    // User transitions events include activities such as a user being created, activated, suspended, or closed
    if (!!usertransitions) {
      console.log('////////// PROCESSING MARQETA USERTRANSITION WEBHOOK ////////// ');
      for (const usertransition of usertransitions) {
        await handleMarqetaUserTransitionWebhook(usertransition);
      }
    }

    // ACH Origination transition events include activities such as bank transfer being transitioned to a pending, processing, submitted, completed, returned, or cancelled state
    if (!!banktransfertransitions) {
      console.log('////////// PROCESSING MARQETA BANKTRANSFERTRANSITION WEBHOOK ////////// ');
      for (const banktransfertransition of banktransfertransitions) {
        const userTransitions = await ACHTransferModel.findOneAndUpdate(
          {
            token: banktransfertransition.bank_transfer_token,
          },
          {
            $set: { status: banktransfertransition.status },
            $push: { transitions: banktransfertransition },
          },
        );
        // Send push notification of funds available for use
        if (banktransfertransition.status === MarqetaWebhookConstants.COMPLETED && userTransitions?.userId) {
          const user = await UserModel.findById(userTransitions?.userId);
          if (user) {
            await createPushUserNotificationFromUserAndPushData(user, {
              pushNotificationType: PushNotificationTypes.RELOAD_SUCCESS,
              body: 'Your Karma Wallet Card has been reloaded. Click to check your updated account balance!',
              title: 'Reload Success',
            });

            await createPushUserNotificationFromUserAndPushData(user, {
              pushNotificationType: PushNotificationTypes.FUNDS_AVAILABLE,
              body: 'Your funds are now available on your Karma Wallet Card!',
              title: 'Deposit Alert',
            });
          }
        }
      }
    }

    if (!!transactions) {
      console.log('////////// PROCESSING MARQETA TRANSACTION WEBHOOK ////////// ');
      for (const transaction of transactions) {
        // Handle any code that tees off of the transaction code here before mapping to a transaction
        const user = await UserModel.findOne({ 'integrations.marqeta.userToken': transaction?.user_token });
        const { code } = transaction.response as any;
        // Insufficent funds from code
        if (InsufficientFundsConstants.CODES.includes(code)) {
          await createPushUserNotificationFromUserAndPushData(user, {
            pushNotificationType: PushNotificationTypes.BALANCE_THRESHOLD,
            body: 'Your account has a low balance. Click to reload your Karma Wallet Card.',
            title: 'Low Balance Alert',
          });
        }
      }
      const savedTransactions = await mapAndSaveMarqetaTransactionsToKarmaTransactions(transactions);
      await handleTransactionDisputeMacros(savedTransactions);
      await handleTransactionNotifications(savedTransactions);
    }

    if (!!chargebacktransitions) {
      console.log('////////// PROCESSING MARQETA CHARGEBACKTRANSITION WEBHOOK ////////// ');
      const savedChargebacks = await mapAndSaveMarqetaChargebackTransitionsToChargebacks(chargebacktransitions);
      await handleDisputeMacros(savedChargebacks);
    }

    output.api(req, res, { message: 'Marqeta webhook processed successfully.' });
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};
