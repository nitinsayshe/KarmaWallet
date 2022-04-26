import { SandboxedJob } from 'bullmq';
import { SendEmailResponse } from 'aws-sdk/clients/ses';
import { AWSError } from 'aws-sdk';
import { Types } from 'mongoose';
import { EmailTemplates } from '../lib/constants/email';

import { AwsClient } from '../clients/aws';
import { JobNames } from '../lib/constants/jobScheduler';
import { createSentEmailDocument } from '../services/email';

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
  user: Types.ObjectId;
  templateName: EmailTemplates
}

export const exec = async ({
  user,
  templateName,
  template,
  senderEmail,
  subject,
  recipientEmail,
  replyToAddresses,
}: ISendEmailParams) => {
  const awsClient = new AwsClient();
  const emailResponse = await awsClient.sendMail({
    senderEmail,
    template,
    subject,
    replyToAddresses,
    recipientEmail,
  });
  createSentEmailDocument({ user, key: templateName, email: recipientEmail });
  return emailResponse;
};

export const onComplete = async (_: SandboxedJob, result: ISesEmailResult) => {
  console.log(`${JobNames.SendEmail} finished: \n ${JSON.stringify(result)}`);
};
