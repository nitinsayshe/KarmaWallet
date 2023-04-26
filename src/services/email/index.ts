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
import { IVisitorDocument } from '../../models/visitor';

registerHandlebarsOperators(Handlebars);

dayjs.extend(utc);

interface ICreateSentEmailParams {
  key: EmailTemplateKeys;
  email: string;
  user?: Types.ObjectId;
  visitor?: Types.ObjectId;
}

interface IEmailTemplateParams {
  user?: Types.ObjectId;
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
  groupName?: string;
  visitor?: IVisitorDocument;
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
  user?: Types.ObjectId | string;
  visitor?: IVisitorDocument | Types.ObjectId | string;
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
  passwordResetLink?: string;
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
  const subject = 'Karma Wallet Email Verification';
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
  groupName,
  senderEmail = EmailAddresses.NoReply,
  replyToAddresses = [EmailAddresses.ReplyTo],
  sendEmail = true,
}: IEmailVerificationTemplateParams) => {
  const emailTemplateConfig = EmailTemplateConfigs.EmailVerification;
  const { isValid, missingFields } = verifyRequiredFields(['name', 'domain', 'token', 'recipientEmail'], { name, domain, token, recipientEmail });
  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  // TODO: verify param FE/UI will be using to verify
  const verificationLink = `${domain}/account?emailVerification=${token}`;
  const data: any = { verificationLink, name, token };
  if (groupName) data.groupName = groupName;
  const template = buildTemplate({ templateName: emailTemplateConfig.name, data });
  const subject = 'Karma Wallet Email Verification';
  const jobData: IEmailJobData = { template, subject, senderEmail, recipientEmail, replyToAddresses, emailTemplateConfig, user };
  if (sendEmail) EmailBullClient.createJob(JobNames.SendEmail, jobData, defaultEmailJobOptions);
  return { jobData, jobOptions: defaultEmailJobOptions };
};

export const sendAccountCreationVerificationEmail = async ({
  name,
  visitor,
  domain = process.env.FRONTEND_DOMAIN,
  token,
  recipientEmail,
  senderEmail = EmailAddresses.NoReply,
  replyToAddresses = [EmailAddresses.ReplyTo],
  sendEmail = true,
}: IEmailVerificationTemplateParams) => {
  const emailTemplateConfig = EmailTemplateConfigs.CreateAccountEmailVerification;
  const { isValid, missingFields } = verifyRequiredFields(['name', 'domain', 'token', 'recipientEmail'], { name, domain, token, recipientEmail });
  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  const urlParamsString = visitor.integrations.urlParams.map(param => `${param.key}=${param.value}`).join('&');
  // TODO: verify param FE/UI will be using to verify
  const verificationLink = `${domain}?verifyaccount=${token}${!!urlParamsString ? `&${urlParamsString}` : ''}`;
  const template = buildTemplate({ templateName: emailTemplateConfig.name, data: { verificationLink, name, token } });
  const subject = 'Verify your Email Address';
  const jobData: IEmailJobData = { template, subject, senderEmail, recipientEmail, replyToAddresses, emailTemplateConfig, visitor };
  if (sendEmail) EmailBullClient.createJob(JobNames.SendEmail, jobData, defaultEmailJobOptions);
  return { jobData, jobOptions: defaultEmailJobOptions };
};

// Nudge email for a visitor who has not completed account creation
export const sendAccountCreationReminderEmail = async ({
  name,
  visitor,
  domain = process.env.FRONTEND_DOMAIN,
  token,
  recipientEmail,
  senderEmail = EmailAddresses.NoReply,
  replyToAddresses = [EmailAddresses.ReplyTo],
  sendEmail = true,
}: IEmailVerificationTemplateParams) => {
  const emailTemplateConfig = EmailTemplateConfigs.CreateAccountEmailReminder;
  const { isValid, missingFields } = verifyRequiredFields(['name', 'domain', 'token', 'recipientEmail'], { name, domain, token, recipientEmail });
  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  const params = visitor.integrations.urlParams.filter(p => p.key !== 'createaccount');
  const urlParamsString = params.map(param => `${param.key}=${param.value}`).join('&');
  const verificationLink = `${domain}?verifyaccount=${token}${!!urlParamsString ? `&${urlParamsString}` : ''}`;
  const template = buildTemplate({ templateName: emailTemplateConfig.name, data: { verificationLink, name, token } });
  const subject = 'Finish Creating Your Karma Wallet Account';
  const jobData: IEmailJobData = { template, subject, senderEmail, recipientEmail, replyToAddresses, emailTemplateConfig, visitor };
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
  const subject = `Welcome to your Karma Wallet, ${name} 💚`;
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
  const subject = `Welcome to your Karma Wallet, ${name} 💚`;
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
  name,
  senderEmail = EmailAddresses.NoReply,
  replyToAddresses = [EmailAddresses.ReplyTo],
  domain = process.env.FRONTEND_DOMAIN,
  sendEmail = true,
}: ISendTransactionsProcessedEmailParams) => {
  const emailTemplateConfig = EmailTemplateConfigs.TransactionsProcessed;
  const { isValid, missingFields } = verifyRequiredFields(['domain', 'recipientEmail', 'name'], { domain, recipientEmail, name });
  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  const template = buildTemplate({ templateName: emailTemplateConfig.name, data: { domain, name, isSuccess } });
  const subject = 'Your Karma Wallet Impact';
  const jobData: IEmailJobData = { template, subject, senderEmail, recipientEmail, replyToAddresses, emailTemplateConfig, user, isSuccess, name };
  if (sendEmail) EmailBullClient.createJob(JobNames.SendEmail, jobData, defaultEmailJobOptions);
  return { jobData, jobOptions: defaultEmailJobOptions };
};

export const sendPasswordResetEmail = async ({
  user,
  recipientEmail,
  senderEmail = EmailAddresses.NoReply,
  replyToAddresses = [EmailAddresses.ReplyTo],
  domain = process.env.FRONTEND_DOMAIN,
  token,
  name,
  sendEmail = true }: IEmailVerificationTemplateParams) => {
  const emailTemplateConfig = EmailTemplateConfigs.PasswordReset;
  const { isValid, missingFields } = verifyRequiredFields(['token', 'domain', 'recipientEmail', 'name'], { token, domain, recipientEmail, name });
  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  const passwordResetLink = `${domain}/?createpassword=${token}`;
  const template = buildTemplate({ templateName: emailTemplateConfig.name, data: { name, domain, passwordResetLink } });
  const subject = 'Reset your Karma Wallet Password';
  const jobData: IEmailJobData = { template, subject, senderEmail, recipientEmail, replyToAddresses, emailTemplateConfig, user, passwordResetLink };
  if (sendEmail) EmailBullClient.createJob(JobNames.SendEmail, jobData, defaultEmailJobOptions);
  return { jobData, jobOptions: defaultEmailJobOptions };
};

export const createSentEmailDocument = async ({ user, key, email, visitor }: ICreateSentEmailParams) => {
  if ((!user && !visitor) || !key || !email) throw new CustomError('Missing required fields', ErrorTypes.INVALID_ARG);
  const sentEmailDocument = new SentEmailModel({
    sentAt: dayjs().utc().toDate(),
    user,
    visitor,
    key,
    email,
  });
  return sentEmailDocument.save();
};

// for internal use only - used to generate HTML for dev purposes
export const populateEmailTemplate = async (req: IRequest<{}, {}, Partial<IPopulateEmailTemplateRequest>>) => buildTemplate({ templateName: req?.body?.template, data: req.body });
