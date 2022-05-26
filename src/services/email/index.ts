/* eslint-disable prefer-rest-params */
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
import { EmailTemplateKeys, EmailTemplateConfigs, IEmailTemplateConfig } from '../../lib/constants/email';
import { IRequest } from '../../types/request';
import { registerHandlebarsOperators } from '../../lib/registerHandlebarsOperators';

registerHandlebarsOperators(Handlebars);

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
  sendEmail?: boolean;
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

//   const jobData = { template, subject, senderEmail, recipientEmail, replyToAddresses, emailTemplateConfig, user };

export interface IEmailJobData {
  template: string;
  user: Types.ObjectId | string;
  subject: string;
  senderEmail: string;
  recipientEmail: string;
  replyToAddresses: string[];
  emailTemplateConfig?: IEmailTemplateConfig;
  groupName?: string;
  verificationLink?: string;
  domain?: string;
  name?: string;
  style?: string;
  token?: string;
  isSuccess?: boolean;
}
export interface IBuildTemplateParams {
  templateName: EmailTemplateKeys;
  data: Partial<IEmailJobData>;
  templatePath?: string;
  stylePath?: string;
}
export interface ISendTransactionsProcessedEmailParams extends IEmailTemplateParams {
  isSuccess: boolean;
}

// tries 3 times, after 4 sec, 16 sec, and 64 sec
const defaultEmailJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 4000,
  },
};

export const buildTemplate = ({ templateName, data, templatePath, stylePath }: IBuildTemplateParams) => {
  const _templatePath = templatePath || path.join(__dirname, '..', '..', 'templates', 'email', templateName, 'template.hbs');
  const _stylePath = stylePath || path.join(__dirname, '..', '..', 'templates', 'email', templateName, 'style.hbs');
  if (!fs.existsSync(_templatePath)) throw new CustomError('Template not found', ErrorTypes.INVALID_ARG);
  const templateString = fs.readFileSync(_templatePath, 'utf8');
  if (fs.existsSync(_stylePath)) {
    const rawCss = fs.readFileSync(_stylePath, 'utf8');
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
  sendEmail = true,
}: IGroupVerificationTemplateParams) => {
  const { isValid, missingFields } = verifyRequiredFields(['name', 'domain', 'token', 'groupName', 'recipientEmail'], {
    name, domain, token, groupName, recipientEmail,
  });
  const emailTemplateConfig = EmailTemplateConfigs.GroupVerification;
  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  const verificationLink = `${domain}/account?emailVerification=${token}`;
  // override to share email verification template and styles
  const template = buildTemplate({
    templateName: EmailTemplateConfigs.EmailVerification.name,
    data: { verificationLink, name, token, groupName },
  });
  const subject = 'KarmaWallet Email Verification';
  const jobData: IEmailJobData = { template, subject, senderEmail, recipientEmail, replyToAddresses, emailTemplateConfig, user };
  if (sendEmail) EmailBullClient.createJob(JobNames.SendEmail, jobData, defaultEmailJobOptions);
  return { jobData, jobOptions: defaultEmailJobOptions };
};

export const sendEmailVerification = async ({
  user,
  name,
  domain = process.env.FRONTEND_DOMAIN,
  token,
  recipientEmail,
  senderEmail = EmailAddresses.NoReply,
  replyToAddresses = [EmailAddresses.ReplyTo],
  sendEmail = true,
}: IEmailVerificationTemplateParams) => {
  const emailTemplateConfig = EmailTemplateConfigs.EmailVerification;
  const { isValid, missingFields } = verifyRequiredFields(['name', 'domain', 'token', 'recipientEmail'], { name, domain, token, recipientEmail });
  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  // TODO: verify param FE/UI will be using to verify
  const verificationLink = `${domain}/account?emailVerification=${token}`;
  const template = buildTemplate({ templateName: emailTemplateConfig.name, data: { verificationLink, name, token } });
  const subject = 'KarmaWallet Email Verification';
  const jobData: IEmailJobData = { template, subject, senderEmail, recipientEmail, replyToAddresses, emailTemplateConfig, user };
  if (sendEmail) EmailBullClient.createJob(JobNames.SendEmail, jobData, defaultEmailJobOptions);
  return { jobData, jobOptions: defaultEmailJobOptions };
};

// Welcome Flow: No Group
export const sendWelcomeEmail = async ({
  user,
  name,
  domain = process.env.FRONTEND_DOMAIN,
  recipientEmail,
  senderEmail = EmailAddresses.NoReply,
  replyToAddresses = [EmailAddresses.ReplyTo],
  sendEmail = true,
}: IEmailTemplateParams) => {
  const emailTemplateConfig = EmailTemplateConfigs.Welcome;
  const { isValid, missingFields } = verifyRequiredFields(['name', 'domain', 'recipientEmail'], { name, domain, recipientEmail });
  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  const template = buildTemplate({ templateName: emailTemplateConfig.name, data: { name, domain } });
  const subject = `Welcome to your KarmaWallet, ${name} 💚`;
  const jobData: IEmailJobData = { template, subject, senderEmail, recipientEmail, replyToAddresses, emailTemplateConfig, user };
  if (sendEmail) EmailBullClient.createJob(JobNames.SendEmail, jobData, defaultEmailJobOptions);
  return { jobData, jobOptions: defaultEmailJobOptions };
};

// Welcome Flow: User Joined Group w/ Donation Matching
export const sendWelcomeGroupEmail = async ({
  user,
  name,
  domain = process.env.FRONTEND_DOMAIN,
  recipientEmail,
  groupName,
  senderEmail = EmailAddresses.NoReply,
  replyToAddresses = [EmailAddresses.ReplyTo],
  sendEmail = true,
}: IWelcomeGroupTemplateParams) => {
  const emailTemplateConfig = EmailTemplateConfigs.WelcomeGroup;
  const { isValid, missingFields } = verifyRequiredFields(['name', 'domain', 'recipientEmail'], { name, domain, recipientEmail });
  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  // override to share welcome template and styles
  const template = buildTemplate({
    templateName: EmailTemplateConfigs.Welcome.name,
    data: { name, domain, groupName },
  });
  const subject = `Welcome to your KarmaWallet, ${name} 💚`;
  const jobData: IEmailJobData = { template, subject, senderEmail, recipientEmail, replyToAddresses, emailTemplateConfig, user, groupName };
  if (sendEmail) EmailBullClient.createJob(JobNames.SendEmail, jobData, defaultEmailJobOptions);
  return { jobData, jobOptions: defaultEmailJobOptions };
};

// Welcome Flow: Credit Card Not Linked
export const sendWelcomeCC1Email = async ({
  user,
  domain = process.env.FRONTEND_DOMAIN,
  recipientEmail,
  senderEmail = EmailAddresses.NoReply,
  replyToAddresses = [EmailAddresses.ReplyTo],
  sendEmail = true,
}: IEmailTemplateParams) => {
  const emailTemplateConfig = EmailTemplateConfigs.WelcomeCC1;
  const { isValid, missingFields } = verifyRequiredFields(['domain', 'recipientEmail'], { domain, recipientEmail });
  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  const template = buildTemplate({ templateName: emailTemplateConfig.name, data: { domain } });
  // TODO: Update Subject
  const subject = 'Make the Most of your Karma Wallet 💜';
  const jobData: IEmailJobData = { template, subject, senderEmail, recipientEmail, replyToAddresses, emailTemplateConfig, user };
  if (sendEmail) EmailBullClient.createJob(JobNames.SendEmail, jobData, defaultEmailJobOptions);
  return { jobData, jobOptions: defaultEmailJobOptions };
};

// Welcome Flow: Credit Card Not Linked - User Joined Group w/ Donation Matching
export const sendWelcomeCCG1Email = async ({
  user,
  domain = process.env.FRONTEND_DOMAIN,
  recipientEmail,
  groupName,
  senderEmail = EmailAddresses.NoReply,
  replyToAddresses = [EmailAddresses.ReplyTo],
  sendEmail = true,
}: IWelcomeGroupTemplateParams) => {
  const emailTemplateConfig = EmailTemplateConfigs.WelcomeCCG1;
  const { isValid, missingFields } = verifyRequiredFields(['groupName', 'domain', 'recipientEmail'], { groupName, domain, recipientEmail });
  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  // override to share welcomeCC1 template and styles
  const template = buildTemplate({
    templateName: EmailTemplateConfigs.WelcomeCC1.name,
    data: { domain, groupName },
  });
  const subject = 'Make the Most of your Karma Wallet 💜';
  const jobData: IEmailJobData = { template, subject, senderEmail, recipientEmail, replyToAddresses, emailTemplateConfig, groupName, user };
  if (sendEmail) EmailBullClient.createJob(JobNames.SendEmail, jobData, defaultEmailJobOptions);
  return { jobData, jobOptions: defaultEmailJobOptions };
};

export const sendTransactionsProcessedEmail = async ({
  user,
  recipientEmail,
  isSuccess,
  senderEmail = EmailAddresses.NoReply,
  replyToAddresses = [EmailAddresses.ReplyTo],
  domain = process.env.FRONTEND_DOMAIN,
  sendEmail = true,
}: ISendTransactionsProcessedEmailParams) => {
  const emailTemplateConfig = EmailTemplateConfigs.TrasactionsProcessed;
  const { isValid, missingFields } = verifyRequiredFields(['domain', 'recipientEmail'], { domain, recipientEmail });
  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  const template = buildTemplate({ templateName: emailTemplateConfig.name, data: { domain } });
  const subject = 'Your KarmaWallet Impact';
  const jobData: IEmailJobData = { template, subject, senderEmail, recipientEmail, replyToAddresses, emailTemplateConfig, user, isSuccess };
  if (sendEmail) EmailBullClient.createJob(JobNames.SendEmail, jobData, defaultEmailJobOptions);
  return { jobData, jobOptions: defaultEmailJobOptions };
};

export const sendPasswordResetEmail = async ({
  user,
  recipientEmail,
  isSuccess,
  senderEmail = EmailAddresses.NoReply,
  replyToAddresses = [EmailAddresses.ReplyTo],
  domain = process.env.FRONTEND_DOMAIN,
  sendEmail = true }) => {
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
export const populateEmailTemplate = async (req: IRequest<{}, {}, Partial<IPopulateEmailTemplateRequest>>) => buildTemplate({ templateName: req?.body?.template, data: req.body });
