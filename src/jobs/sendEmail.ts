import { SandboxedJob } from 'bullmq';
import { SendEmailResponse } from 'aws-sdk/clients/ses';
import { AWSError } from 'aws-sdk';

import { sendMail } from '../services/aws/email';
import { JobNames } from '../lib/constants/jobScheduler';

interface ISesEmailResult {
  SendEmailResponse: SendEmailResponse,
  AWSError: AWSError,
}

export interface ISendEmailParams {
  template: string,
  senderEmail: string,
  subject: string;
  replyToAddresses: string[];
  recipientEmail: string;
}

export const exec = async ({
  template, senderEmail, subject, recipientEmail, replyToAddresses,
}: ISendEmailParams) => {
  const emailResponse = await sendMail({
    senderEmail, template, subject, replyToAddresses, recipientEmail,
  });
  console.log({ emailResponse });
  return emailResponse;
};

export const onComplete = async (job: SandboxedJob, result: ISesEmailResult) => {
  console.log(`${JobNames.SendEmail} finished: \n ${JSON.stringify(result)}`);
};
