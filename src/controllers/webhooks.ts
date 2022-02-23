import { mapTransactions } from '../integrations/rare';
import { api, error } from '../services/output';
import CustomError, { asCustomError } from '../lib/customError';
import KarmaApiClient from '../integrations/karmaApi';
import { ErrorTypes } from '../lib/constants';
import { IRequestHandler } from '../types/request';
import { IRareTransaction } from '../integrations/rare/transaction';

interface IRareTransactionBody {
  transaction: IRareTransaction;
}

export const mapRareTransaction: IRequestHandler<{}, {}, IRareTransactionBody> = async (req, res) => {
  if (req.headers?.['rare-webhook-key'] !== 'KFVKe5584dBb6y22SSwePMPG8MaskwvSxr86tWYPT4R8WkG6JDbUcMGMBE838jQu') return error(req, res, new CustomError('Access Denied', ErrorTypes.NOT_ALLOWED));
  try {
    const client = new KarmaApiClient();
    const rareTransaction = req?.body?.transaction;
    const uid = rareTransaction?.user?.external_id;
    await mapTransactions([rareTransaction]);
    await client.sendRareWebhook(uid);
    api(req, res, { message: 'KarmaWallet/Rare transaction processed successfully.' });
  } catch (e) {
    console.log('/////////////// RARE WEBHOOK ERROR ///////////////////////\n');
    error(req, res, asCustomError(e));
  }
};
