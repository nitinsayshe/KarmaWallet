import { SandboxedJob } from 'bullmq';
import { mockRequest } from '../lib/constants/request';

import { mapTransactionsFromPlaid } from '../integrations/plaid';
import { JobNames } from '../lib/constants/jobScheduler';
import { SocketClient } from '../clients/socket';
import { SocketEvents, SocketEventTypes } from '../lib/constants/sockets';
import { INextJob } from '../clients/bull/base';
import * as EmailService from '../services/email';
import { getUser } from '../services/user';
import { IRequest } from '../types/request';
import { _updateCards } from '../services/card';

interface IPlaidTransactionMapperResult {
  userId: string,
  nextJobs: INextJob[],
  message: string,
}

interface IUserPlaidTransactionMapParams {
  userId: string,
  accessToken: string,
}

interface IResult {
  message: string;
  userId?: string;
}

export const exec = async ({ userId, accessToken }: IUserPlaidTransactionMapParams) => {
  // initial card linking for individual user
  let isSuccess = false;
  let result: IResult;
  // regardless of result, the intial processing should be set to false
  await _updateCards({ 'integrations.plaid.accessToken': accessToken }, { initialTransactionsProcessing: false });
  try {
    await mapTransactionsFromPlaid(mockRequest, [accessToken], 730);
    isSuccess = true;
    result = {
      message: `Successfully mapped transactions for user: ${userId}`,
      userId,
    };
  } catch (err: any) {
    result = {
      message: `Error: ${err.message}`,
    };
  }

  try {
    // setting up transacation processed email
    const user = await getUser({} as IRequest, { _id: userId });
    const { jobData, jobOptions } = await EmailService.sendTransactionsProcessedEmail({
      user: user._id,
      name: user.name,
      recipientEmail: user.emails.find(e => e.primary).email,
      isSuccess,
      sendEmail: false,
    });
    const nextJobs: INextJob[] = [
      {
        name: JobNames.SendEmail,
        data: jobData,
        options: jobOptions,
      },
    ];
    return { nextJobs, ...result };
  } catch (err: any) {
    return {
      message: `Error: ${err.message}`,
    };
  }
};

export const onComplete = async (job: SandboxedJob, result: IPlaidTransactionMapperResult) => {
  SocketClient.socket.emit({ rooms: [`user/${result.userId}`], eventName: SocketEvents.Update, type: SocketEventTypes.PlaidTransactionsReady });
  console.log(`${JobNames.UserPlaidTransactionMapper} finished: \n ${JSON.stringify(result)}`);
};
