import { SandboxedJob } from 'bullmq';
import { SendEmailResponse } from 'aws-sdk/clients/ses';
import { AWSError } from 'aws-sdk';
import { Types } from 'mongoose';
import { IEmailTemplateConfig, EmailTemplateTypes } from '../lib/constants/email';

import { AwsClient } from '../clients/aws';
import { JobNames } from '../lib/constants/jobScheduler';
import { createSentEmailDocument } from '../services/email';
import { UserEmailStatus, UserModel } from '../models/user';

const DEV_TEST = true;
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
  emailTemplateConfig: IEmailTemplateConfig;
}

// offloading email type check and user email status check to sendMail job

export const exec = async ({
  user,
  emailTemplateConfig,
  template,
  senderEmail,
  subject,
  recipientEmail,
  replyToAddresses,
}: ISendEmailParams) => {
  const { name, type } = emailTemplateConfig;
  const _user = await UserModel.findOne({ _id: user });
  const userEmailObject = _user.emails.find(u => u.email === recipientEmail);

  if (!userEmailObject) return;

  // no emails should be sent with these statuses
  if (userEmailObject.status === UserEmailStatus.Bounced || userEmailObject.status === UserEmailStatus.Complained) return;

  if (type !== EmailTemplateTypes.Essential) {
    // marketing check for subscribed updates
    if (type === EmailTemplateTypes.Marketing && !_user.subscribedUpdates) return;

    // any email other than verification or essential, check verification status
    if (type !== EmailTemplateTypes.Verification && userEmailObject.status !== UserEmailStatus.Verified) return;
  }

  if (DEV_TEST) {
    console.log({
      subject,
      recipientEmail,
      templateName: emailTemplateConfig.name,
      templateType: emailTemplateConfig.type,
    });
    createSentEmailDocument({ user, key: name, email: recipientEmail });
    return `\nMock email sent to ${recipientEmail}`;
  }

  const awsClient = new AwsClient();

  // const emailResponse = await awsClient.sendMail({
  //   senderEmail,
  //   template,
  //   subject,
  //   replyToAddresses,
  //   recipientEmail,
  // });

  createSentEmailDocument({ user, key: name, email: recipientEmail });

  return 'emailResponse';
};

export const onComplete = async (_: SandboxedJob, result: ISesEmailResult) => {
  console.log(`${JobNames.SendEmail} finished: \n ${JSON.stringify(result)}`);
};
