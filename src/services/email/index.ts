import Handlebars from 'handlebars';
import path from 'path';
import fs from 'fs';
import { Types } from 'mongoose';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { MainBullClient } from '../../clients/bull/main';
import { JobNames } from '../../lib/constants/jobScheduler';
import { EmailAddresses, ErrorTypes } from '../../lib/constants';
import CustomError from '../../lib/customError';
import { verifyRequiredFields } from '../../lib/requestData';
import { colors } from '../../lib/colors';
import { EmailTemplates, SentEmailModel } from '../../models/sentEmail';

dayjs.extend(utc);

interface ICreateSentEmailParams {
  key: EmailTemplates;
  email: string;
  user: Types.ObjectId;
}

interface IEmailTemplateParams {
  user: Types.ObjectId
  name: string;
  recipientEmail: string;
  senderEmail?: string;
  replyToAddresses?: string[];
  domain?: string;
}

interface IEmailVerificationTemplateParams extends IEmailTemplateParams {
  token: string;
}

interface IGroupVerificationTemplateParams extends IEmailVerificationTemplateParams {
  groupName: string;
}

export const buildTemplate = (templateName: string, data: any) => {
  const templatePath = path.join(__dirname, '..', '..', 'templates', 'email', templateName, 'template.hbs');
  const stylePath = path.join(__dirname, '..', '..', 'templates', 'email', templateName, 'style.hbs');
  if (!fs.existsSync(templatePath)) {
    throw new CustomError('Template not found', ErrorTypes.INVALID_ARG);
  }
  const templateString = fs.readFileSync(templatePath, 'utf8');
  if (fs.existsSync(stylePath)) {
    const rawCss = fs.readFileSync(stylePath, 'utf8');
    const styleTemplateRaw = Handlebars.compile(rawCss);
    const styleTemplate = styleTemplateRaw({ colors });
    data.style = styleTemplate;
  }
  const template = Handlebars.compile(templateString);
  return template(data);
};

export const sendGroupVerificationEmail = async ({
  user,
  name,
  domain = process.env.FRONTEND_DOMAIN,
  token,
  groupName,
  recipientEmail,
  senderEmail = EmailAddresses.NoReply,
  replyToAddresses = [EmailAddresses.ReplyTo],
}: IGroupVerificationTemplateParams) => {
  const { isValid, missingFields } = verifyRequiredFields(['name', 'domain', 'token', 'groupName', 'recipientEmail'], {
    name, domain, token, groupName, recipientEmail,
  });
  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  const verificationLink = `${domain}/account?emailVerification=${token}`;
  const template = buildTemplate(EmailTemplates.GroupVerification, { verificationLink, name, token, groupName });
  const subject = 'KarmaWallet Email Verification';
  const jobData = { template, subject, senderEmail, recipientEmail, replyToAddresses, templateName: EmailTemplates.GroupVerification, user };
  // tries 3 times, after 4 sec, 16 sec, and 64 sec
  const jobOptions = {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 4000,
    },
  };
  return MainBullClient.createJob(JobNames.SendEmail, jobData, jobOptions);
};

export const sendEmailVerification = async ({
  user,
  name,
  domain = process.env.FRONTEND_DOMAIN,
  token,
  recipientEmail,
  senderEmail = EmailAddresses.NoReply,
  replyToAddresses = [EmailAddresses.ReplyTo],
}: IEmailVerificationTemplateParams) => {
  const { isValid, missingFields } = verifyRequiredFields(['name', 'domain', 'token', 'recipientEmail'], { name, domain, token, recipientEmail });
  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  // TODO: verify param FE/UI will be using to verify
  const verificationLink = `${domain}/account?emailVerification=${token}`;
  const template = buildTemplate(EmailTemplates.EmailVerification, { verificationLink, name, token });
  const subject = 'KarmaWallet Email Verification';
  const jobData = { template, subject, senderEmail, recipientEmail, replyToAddresses, templateName: EmailTemplates.EmailVerification, user };
  // tries 3 times, after 4 sec, 16 sec, and 64 sec
  const jobOptions = {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 4000,
    },
  };
  return MainBullClient.createJob(JobNames.SendEmail, jobData, jobOptions);
};

export const sendWelcomeEmail = async ({
  user,
  name,
  domain = process.env.FRONTEND_DOMAIN,
  recipientEmail,
  senderEmail = EmailAddresses.NoReply,
  replyToAddresses = [EmailAddresses.ReplyTo],
}: IEmailTemplateParams) => {
  const { isValid, missingFields } = verifyRequiredFields(['name', 'domain', 'recipientEmail'], { name, domain, recipientEmail });
  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  const template = buildTemplate(EmailTemplates.Welcome, { name, domain });
  const subject = 'Welcome to KarmaWallet!';
  const jobData = { template, subject, senderEmail, recipientEmail, replyToAddresses, templateName: EmailTemplates.Welcome, user };
  // tries 3 times, after 4 sec, 16 sec, and 64 sec
  const jobOptions = {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 4000,
    },
  };
  return MainBullClient.createJob(JobNames.SendEmail, jobData, jobOptions);
};

export const createSentEmailDocument = async ({ user, key, email }: ICreateSentEmailParams) => {
  if (!user || !key || !email) throw new CustomError('Missing required fields', ErrorTypes.INVALID_ARG);
  const sentEmailDocument = new SentEmailModel({
    sentAt: dayjs().utc().toDate(),
    user,
    key,
    email,
  });
  return sentEmailDocument.save();
};
