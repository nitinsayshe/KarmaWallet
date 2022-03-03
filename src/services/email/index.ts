import Handlebars from 'handlebars';
import path from 'path';
import fs from 'fs';
import { MainBullClient } from '../../clients/bull/main';
import { JobNames } from '../../lib/constants/jobScheduler';
import { EmailAddresses } from '../../lib/constants';

export enum EmailTemplates {
  GroupVerification = 'groupVerification',
}

export const buildTemplate = (templateName: string, data: any) => {
  const templatePath = path.join(__dirname, '..', '..', 'templates', 'email', templateName, 'template.hbs');
  const stylePath = path.join(__dirname, '..', '..', 'templates', 'email', templateName, 'style.css');
  const templateString = fs.readFileSync(templatePath, 'utf8');
  if (fs.existsSync(stylePath)) {
    data.style = fs.readFileSync(stylePath, 'utf8');
  }
  const template = Handlebars.compile(templateString);
  return template(data);
};

interface IGroupVerificationTemplateParams {
  name: string;
  domain: string;
  token: string;
  groupName: string;
  recipientEmail: string;
  senderEmail?: string;
  replyToAddresses?: string[];
}

export const sendGroupVerificationEmail = async ({
  name, domain, token, groupName, recipientEmail, senderEmail = EmailAddresses.NoReply, replyToAddresses = [EmailAddresses.ReplyTo],
}: IGroupVerificationTemplateParams) => {
  // TODO: update verificationLink with URL implemented in UI
  const verificationLink = `${domain}/account?verifyGroupEmail=${token}`;
  const template = buildTemplate(EmailTemplates.GroupVerification, {
    verificationLink, name, token, groupName,
  });
  const subject = 'KarmaWallet Email Verification';
  return MainBullClient.createJob(JobNames.SendEmail, {
    template, subject, senderEmail, recipientEmail, replyToAddresses,
  });
};
