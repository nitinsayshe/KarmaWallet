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

// these are query parameters that were sent
// from the karma frontend to the rare transactions
// page, and then rare is taking them and dropping
// then into the body of this request for us

interface IRareRelayedQueryParams {
  groupId?: string;
  statementIds?: string[];
}
interface IRareTransactionBody {
  transaction: IRareTransaction;
  // TODO: may need to update this property name...
  forwarded_query_params?: IRareRelayedQueryParams;
}

interface IUserPlaidTransactionsMapBody {
  userId: String;
  accessToken: String
}

export const mapRareTransaction: IRequestHandler<{}, {}, IRareTransactionBody> = async (req, res) => {
  if (process.env.KW_ENV !== 'staging' && req.headers?.['rare-webhook-key'] !== 'KFVKe5584dBb6y22SSwePMPG8MaskwvSxr86tWYPT4R8WkG6JDbUcMGMBE838jQu') return error(req, res, new CustomError('Access Denied', ErrorTypes.NOT_ALLOWED));
  try {
    const client = new KarmaApiClient();
    console.log('\n\n/////////////// RARE TRANSACTION ///////////////////////\n\n');
    console.log({ rareTransaction: req?.body?.transaction });
    console.log(req.body);

    const rareTransaction = req?.body?.transaction;
    const uid = rareTransaction?.user?.external_id;
    await mapTransactions([rareTransaction]);

    // const { statementIds, groupId } = (req.body.params || {});
    // if (!!statementIds) {
    // const matchStatementData: IGroupOffsetMatchData = {
    //   groupId,
    //   statementIds,
    //   totalAmountMatched: rareTransaction.amt,
    //   transactor: { user: uid, group: req.body.params.groupId },
    // };
    // await matchMemberOffsets(req, matchStatementData);
    // TODO: send socket event notifying user of matches being successfully applied.
    // } else {
    //   await client.sendRareWebhook(uid);
    // }

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
