import { SandboxedJob } from 'bullmq';
import { SendEmailResponse } from 'aws-sdk/clients/ses';
import { AWSError } from 'aws-sdk';
import { Types } from 'mongoose';
import { IEmailTemplateConfig, EmailTemplateTypes } from '../lib/constants/email';

import { AwsClient } from '../clients/aws';
import { JobNames } from '../lib/constants/jobScheduler';
import { createSentEmailDocument } from '../services/email';
import { UserEmailStatus, UserModel } from '../models/user';
import { IVisitorDocument } from '../models/visitor';

/**
 * !IMPORTANT!
 * THIS FLAG IS FOR TESTING https://github.com/karmawallet/karmawallet/issues/356 ONLY
 * THIS SHOULD BE REMOVED FOR PRODUCTION AS IT BLOCKS ALL EMAILS FROM BEING SENT
 */
const DEV_TEST = false;
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
  user?: Types.ObjectId;
  visitor?: IVisitorDocument;
  emailTemplateConfig: IEmailTemplateConfig;
}

export const exec = async ({
  user,
  visitor,
  emailTemplateConfig,
  template,
  senderEmail,
  subject,
  recipientEmail,
  replyToAddresses,
}: ISendEmailParams) => {
  const { name, type } = emailTemplateConfig;
  if (!user && !visitor) throw new Error('Must provide either user or visitor');
  let _user;
  let userEmailObject;
  if (!!user && type !== EmailTemplateTypes.Support) {
    _user = await UserModel.findOne({ _id: user });
    userEmailObject = _user.emails.find(u => u.email === recipientEmail);
    if (!userEmailObject) return;
    // no emails should be sent with these statuses
    if (userEmailObject.status === UserEmailStatus.Bounced || userEmailObject.status === UserEmailStatus.Complained) return;
    if (type !== EmailTemplateTypes.Essential && type !== EmailTemplateTypes.CashbackNotificaiton) {
      // marketing check for subscribed updates
      if (type === EmailTemplateTypes.Marketing) return;
      // any email other than verification or essential, check verification status
      if (type !== EmailTemplateTypes.Verification && userEmailObject.status !== UserEmailStatus.Verified) return;
    }
  }

  if (!!visitor && (visitor.emailStatus === UserEmailStatus.Bounced || visitor.emailStatus === UserEmailStatus.Complained)) return;

  if (DEV_TEST) {
    console.log({
      subject,
      recipientEmail,
      templateName: emailTemplateConfig.name,
      templateType: emailTemplateConfig.type,
    });
    createSentEmailDocument({ user, visitor: visitor?._id, key: name, email: recipientEmail });
    return `\nMock email sent to ${recipientEmail}`;
  }

  let emailResponse;
  if (!DEV_TEST) {
    const awsClient = new AwsClient();

    emailResponse = await awsClient.sendMail({
      senderEmail,
      template,
      subject,
      replyToAddresses,
      recipientEmail,
    });
  }

  createSentEmailDocument({ user, visitor: visitor?._id, key: name, email: recipientEmail });
  return emailResponse;
};

export const onComplete = async (_: SandboxedJob, result: ISesEmailResult) => {
  console.log(`${JobNames.SendEmail} finished: \n ${JSON.stringify(result)}`);
};
