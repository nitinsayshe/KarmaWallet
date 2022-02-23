import { SandboxedJob } from 'bullmq';
import { mockRequest } from '../lib/constants/request';

import { mapTransactionsFromPlaid } from '../integrations/plaid';
import KarmaApiClient from '../integrations/karmaApi';

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
  return userId;
};

export const onComplete = async (job: SandboxedJob, result: IPlaidTransactionMapperResult) => {
  const client = new KarmaApiClient();
  await client.sendPlaidTransactionsReadyWebhook(result.userId);
};
