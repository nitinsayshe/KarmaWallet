import { SandboxedJob } from 'bullmq';
import { mockRequest } from '../lib/constants/request';

import { mapTransactionsFromPlaid } from '../integrations/plaid';
import KarmaApiClient from '../integrations/karmaApi';
import { JobNames } from '../lib/constants/jobScheduler';
import { SocketClient } from '../clients/socket';
import { SocketEvents, SocketEventTypes } from '../lib/constants/sockets';

interface IPlaidTransactionMapperResult {
  userId: string,
}

interface IUserPlaidTransactionMapParams {
  userId: string,
  accessToken: string,
}

export const exec = async ({ userId, accessToken }: IUserPlaidTransactionMapParams) => {
  // initial card linking for individual user
  await mapTransactionsFromPlaid(mockRequest, [accessToken], 730);
  return { userId, accessToken };
};

export const onComplete = async (job: SandboxedJob, result: IPlaidTransactionMapperResult) => {
  // TODO: remove when TONGASS is launched
  const client = new KarmaApiClient();
  await client.sendPlaidTransactionsReadyWebhook(result.userId);

  SocketClient.socket.emit({ rooms: [`user/${result.userId}`], eventName: SocketEvents.Update, type: SocketEventTypes.PlaidTransactionsReady });
  console.log(`${JobNames.UserPlaidTransactionMapper} finished: \n ${JSON.stringify(result)}`);
};
