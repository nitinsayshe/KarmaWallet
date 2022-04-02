import { mapTransactions } from '../integrations/rare';
import { api, error } from '../services/output';
import CustomError, { asCustomError } from '../lib/customError';
import KarmaApiClient from '../integrations/karmaApi';
import { ErrorTypes } from '../lib/constants';
import { IRequestHandler } from '../types/request';
import { IRareTransaction } from '../integrations/rare/transaction';
import { MainBullClient } from '../clients/bull/main';
import { JobNames } from '../lib/constants/jobScheduler';

const { KW_API_SERVICE_HEADER, KW_API_SERVICE_VALUE } = process.env;

interface IRareTransactionBody {
  transaction: IRareTransaction;
}

interface IUserPlaidTransactionsMapBody {
  userId: String;
  accessToken: String
}

export const mapRareTransaction: IRequestHandler<{}, {}, IRareTransactionBody> = async (req, res) => {
  if (req.headers?.['rare-webhook-key'] !== 'KFVKe5584dBb6y22SSwePMPG8MaskwvSxr86tWYPT4R8WkG6JDbUcMGMBE838jQu') return error(req, res, new CustomError('Access Denied', ErrorTypes.NOT_ALLOWED));
  try {
    const client = new KarmaApiClient();
    console.log('\n\n/////////////// RARE TRANSACTION ///////////////////////\n\n');
    console.log({ rareTransaction: req?.body?.transaction });

    const rareTransaction = req?.body?.transaction;
    const uid = rareTransaction?.user?.external_id;
    await mapTransactions([rareTransaction]);
    await client.sendRareWebhook(uid);
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
    MainBullClient.createJob(JobNames.UserPlaidTransactionMapper, { userId, accessToken });
    api(req, res, { message: `${JobNames.UserPlaidTransactionMapper} added to queue` });
  } catch (e) {
    error(req, res, asCustomError(e));
  }
};
