import Handlebars from 'handlebars';
import path from 'path';
import fs from 'fs';
import { Types } from 'mongoose';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { EmailBullClient } from '../../clients/bull/email';
import { JobNames } from '../../lib/constants/jobScheduler';
import { EmailAddresses, ErrorTypes } from '../../lib/constants';
import CustomError from '../../lib/customError';
import { verifyRequiredFields } from '../../lib/requestData';
import { colors } from '../../lib/colors';
import { SentEmailModel } from '../../models/sentEmail';
import { EmailTemplateKeys, EmailTemplateConfigs } from '../../lib/constants/email';
import { IRequest } from '../../types/request';

dayjs.extend(utc);

interface ICreateSentEmailParams {
  key: EmailTemplateKeys;
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

interface IWelcomeGroupTemplateParams extends IEmailTemplateParams {
  groupName: string;
}

interface IEmailVerificationTemplateParams extends IEmailTemplateParams {
  token: string;
}

interface IGroupVerificationTemplateParams extends IEmailVerificationTemplateParams {
  groupName: string;
}

export interface IPopulateEmailTemplateRequest extends IEmailVerificationTemplateParams {
  template: EmailTemplateKeys;
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
  const emailTemplateConfig = EmailTemplateConfigs.GroupVerification;
  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  const verificationLink = `${domain}/account?emailVerification=${token}`;
  const template = buildTemplate(emailTemplateConfig.name, { verificationLink, name, token, groupName });
  const subject = 'KarmaWallet Email Verification';
  const jobData = { template, subject, senderEmail, recipientEmail, replyToAddresses, emailTemplateConfig, user };
  // tries 3 times, after 4 sec, 16 sec, and 64 sec
  const jobOptions = {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 4000,
    },
  };
  return EmailBullClient.createJob(JobNames.SendEmail, jobData, jobOptions);
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
  const emailTemplateConfig = EmailTemplateConfigs.EmailVerification;
  const { isValid, missingFields } = verifyRequiredFields(['name', 'domain', 'token', 'recipientEmail'], { name, domain, token, recipientEmail });
  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  // TODO: verify param FE/UI will be using to verify
  const verificationLink = `${domain}/account?emailVerification=${token}`;
  const template = buildTemplate(emailTemplateConfig.name, { verificationLink, name, token });
  const subject = 'KarmaWallet Email Verification';
  const jobData = { template, subject, senderEmail, recipientEmail, replyToAddresses, emailTemplateConfig, user };
  // tries 3 times, after 4 sec, 16 sec, and 64 sec
  const jobOptions = {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 4000,
    },
  };
  return EmailBullClient.createJob(JobNames.SendEmail, jobData, jobOptions);
};

export const sendWelcomeEmail = async ({
  user,
  name,
  domain = process.env.FRONTEND_DOMAIN,
  recipientEmail,
  senderEmail = EmailAddresses.NoReply,
  replyToAddresses = [EmailAddresses.ReplyTo],
}: IEmailTemplateParams) => {
  const emailTemplateConfig = EmailTemplateConfigs.Welcome;
  const { isValid, missingFields } = verifyRequiredFields(['name', 'domain', 'recipientEmail'], { name, domain, recipientEmail });
  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  const template = buildTemplate(emailTemplateConfig.name, { name, domain });
  const subject = 'Welcome to KarmaWallet!';
  const jobData = { template, subject, senderEmail, recipientEmail, replyToAddresses, emailTemplateConfig, user };
  // tries 3 times, after 4 sec, 16 sec, and 64 sec
  const jobOptions = {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 4000,
    },
  };
  return EmailBullClient.createJob(JobNames.SendEmail, jobData, jobOptions);
};

export const sendWelcomeGroupEmail = async ({
  user,
  name,
  domain = process.env.FRONTEND_DOMAIN,
  recipientEmail,
  groupName,
  senderEmail = EmailAddresses.NoReply,
  replyToAddresses = [EmailAddresses.ReplyTo],
}: IWelcomeGroupTemplateParams) => {
  const emailTemplateConfig = EmailTemplateConfigs.WelcomeGroup;
  const { isValid, missingFields } = verifyRequiredFields(['name', 'domain', 'recipientEmail'], { name, domain, recipientEmail });
  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  const template = buildTemplate(emailTemplateConfig.name, { name, domain });
  const subject = 'Welcome to KarmaWallet!';
  const jobData = { template, subject, senderEmail, recipientEmail, replyToAddresses, emailTemplateConfig, user, groupName };
  // tries 3 times, after 4 sec, 16 sec, and 64 sec
  const jobOptions = {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 4000,
    },
  };
  return EmailBullClient.createJob(JobNames.SendEmail, jobData, jobOptions);
};

export const sendWelcomeCC1Email = async ({
  user,
  domain = process.env.FRONTEND_DOMAIN,
  recipientEmail,
  senderEmail = EmailAddresses.NoReply,
  replyToAddresses = [EmailAddresses.ReplyTo],
}: IEmailTemplateParams) => {
  const emailTemplateConfig = EmailTemplateConfigs.WelcomeCC1;
  const { isValid, missingFields } = verifyRequiredFields(['name', 'domain', 'recipientEmail'], { name, domain, recipientEmail });
  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  const template = buildTemplate(emailTemplateConfig.name, { name, domain });
  // TODO: Update Subject
  const subject = 'Welcome to KarmaWallet!';
  const jobData = { template, subject, senderEmail, recipientEmail, replyToAddresses, emailTemplateConfig, user };
  // tries 3 times, after 4 sec, 16 sec, and 64 sec
  const jobOptions = {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 4000,
    },
  };
  return EmailBullClient.createJob(JobNames.SendEmail, jobData, jobOptions);
};

export const sendWelcomeCCG1Email = async ({
  user,
  domain = process.env.FRONTEND_DOMAIN,
  recipientEmail,
  groupName,
  senderEmail = EmailAddresses.NoReply,
  replyToAddresses = [EmailAddresses.ReplyTo],
}: IWelcomeGroupTemplateParams) => {
  const emailTemplateConfig = EmailTemplateConfigs.WelcomeCC1;
  const { isValid, missingFields } = verifyRequiredFields(['name', 'domain', 'recipientEmail'], { name, domain, recipientEmail });
  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  const template = buildTemplate(emailTemplateConfig.name, { name, domain });
  // TODO: Update Subject
  const subject = 'Welcome to KarmaWallet!';
  const jobData = { template, subject, senderEmail, recipientEmail, replyToAddresses, emailTemplateConfig, groupName, user };
  // tries 3 times, after 4 sec, 16 sec, and 64 sec
  const jobOptions = {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 4000,
    },
  };
  return EmailBullClient.createJob(JobNames.SendEmail, jobData, jobOptions);
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

// for internal use only - used to generate HTML for dev purposes
export const populateEmailTemplate = async (req: IRequest<{}, {}, Partial<IPopulateEmailTemplateRequest>>) => buildTemplate(req?.body?.template, req.body);
