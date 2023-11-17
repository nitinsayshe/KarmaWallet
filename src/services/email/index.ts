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
import CustomError, { asCustomError } from '../../lib/customError';
import { verifyRequiredFields } from '../../lib/requestData';
import { colors } from '../../lib/colors';
import { SentEmailModel } from '../../models/sentEmail';
import { EmailTemplateKeys, EmailTemplateConfigs, IEmailTemplateConfig } from '../../lib/constants/email';
import { IRequest } from '../../types/request';
import { registerHandlebarsOperators } from '../../lib/registerHandlebarsOperators';
import { IVisitorDocument } from '../../models/visitor';
import { IUserDocument, UserModel } from '../../models/user';

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
  amount?: string;
  recipientEmail: string;
  senderEmail?: string;
  replyToAddresses?: string[];
  domain?: string;
  sendEmail?: boolean;
}

interface IDeleteAccountRequestVerificationTemplateParams {
  domain?: string;
  user: IUserDocument;
  deleteReason: string;
  deleteAccountRequestId: string;
  recipientEmail?: string;
  replyToAddresses?: string[];
  senderEmail?: string;
  message?: string;
}

interface IWelcomeGroupTemplateParams extends IEmailTemplateParams {
  groupName: string;
}

interface IEmailVerificationTemplateParams extends IEmailTemplateParams {
  token: string;
  groupName?: string;
  visitor?: IVisitorDocument;
  companyName?: string;
  amount?: string;
}

interface ISupportEmailVerificationTemplateParams {
  domain?: string;
  message: string;
  replyToAddresses?: string[];
  senderEmail?: string;
  user: IUserDocument;
  supportTicketId: string;
  recipientEmail?: string;
}

interface IGroupVerificationTemplateParams extends IEmailVerificationTemplateParams {
  groupName: string;
}

export interface IPopulateEmailTemplateRequest extends IEmailVerificationTemplateParams {
  template: EmailTemplateKeys;
}

//   const jobData = { template, subject, senderEmail, recipientEmail, replyToAddresses, emailTemplateConfig, user };

export interface IEmailJobData {
  amount?: string;
  companyName?: string;
  currentYear?: string;
  domain?: string;
  emailTemplateConfig?: IEmailTemplateConfig;
  footerStyle?: string;
  groupName?: string;
  isSuccess?: boolean;
  name?: string;
  passwordResetLink?: string;
  recipientEmail: string;
  replyToAddresses: string[];
  senderEmail: string;
  style?: string;
  subject: string;
  template: string;
  templateStyle?: string;
  token?: string;
  message?: string;
  supportTicketId?: string;
  userId?: string;
  userEmail?: string;
  deleteAccountRequestId?: string;
  deleteReason?: string;
  user?: Types.ObjectId | string;
  verificationLink?: string;
  visitor?: IVisitorDocument | Types.ObjectId | string;
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

export const buildTemplate = ({ templateName, data, templatePath }: IBuildTemplateParams) => {
  // Add Template Content and Styles for this particular email
  const _bodyPath = templatePath || path.join(__dirname, '..', '..', 'templates', 'email', templateName, 'template.hbs');
  const _templateStylePath = path.join(__dirname, '..', '..', 'templates', 'email', templateName, 'style.hbs');
  if (!fs.existsSync(_bodyPath)) throw new CustomError('Template not found for email', ErrorTypes.INVALID_ARG);
  const bodyString = fs.readFileSync(_bodyPath, 'utf8');
  Handlebars.registerPartial('body', bodyString);

  if (fs.existsSync(_templateStylePath)) {
    const rawCss = fs.readFileSync(_templateStylePath, 'utf8');
    const styleTemplateRaw = Handlebars.compile(rawCss);
    const styleTemplate = styleTemplateRaw({ colors });
    data.templateStyle = styleTemplate;
  }

  // Add shared Footer Content and Styles
  const _footerPath = path.join(__dirname, '..', '..', 'templates', 'email', 'footer', 'template.hbs');
  const _footerStylePath = path.join(__dirname, '..', '..', 'templates', 'email', 'footer', 'style.hbs');
  if (!fs.existsSync(_footerPath)) throw new CustomError('Footer file not found', ErrorTypes.INVALID_ARG);
  if (!fs.existsSync(_footerStylePath)) throw new CustomError('Footer style file not found', ErrorTypes.INVALID_ARG);
  const footerString = fs.readFileSync(_footerPath, 'utf8');
  Handlebars.registerPartial('footer', footerString);

  if (fs.existsSync(_footerStylePath)) {
    const rawCss = fs.readFileSync(_footerStylePath, 'utf8');
    const styleTemplateRaw = Handlebars.compile(rawCss);
    const styleTemplate = styleTemplateRaw({ colors });
    data.footerStyle = styleTemplate;
  }

  // Add shared Base Email and Styles
  const _stylePath = path.join(__dirname, '..', '..', 'templates', 'email', 'style.hbs');
  const _baseEmailPath = templatePath || path.join(__dirname, '..', '..', 'templates', 'email', 'baseEmail.hbs');
  if (!fs.existsSync(_baseEmailPath)) throw new CustomError('Base email file not found', ErrorTypes.INVALID_ARG);
  const templateString = fs.readFileSync(_baseEmailPath, 'utf8');

  if (fs.existsSync(_stylePath)) {
    const rawCss = fs.readFileSync(_stylePath, 'utf8');
    const styleTemplateRaw = Handlebars.compile(rawCss);
    const styleTemplate = styleTemplateRaw({ colors });
    data.style = styleTemplate;
  }

  // Compile and return template
  const template = Handlebars.compile(templateString);
  data.currentYear = dayjs().year().toString();
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

export const sendChangePasswordEmail = async ({
  name,
  user,
  token,
  domain = process.env.FRONTEND_DOMAIN,
  recipientEmail,
  senderEmail = EmailAddresses.NoReply,
  replyToAddresses = [EmailAddresses.ReplyTo],
  sendEmail = true,
}: IEmailVerificationTemplateParams) => {
  const emailTemplateConfig = EmailTemplateConfigs.ChangePassword;
  const { isValid, missingFields } = verifyRequiredFields(['name', 'domain', 'recipientEmail'], { name, domain, recipientEmail, token });
  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  const passwordResetLink = `${domain}/?createpassword=${token}`;
  const template = buildTemplate({ templateName: emailTemplateConfig.name, data: { name, domain, passwordResetLink } });
  const subject = 'Change Your Karma Wallet Password';
  const jobData: IEmailJobData = { template, subject, senderEmail, recipientEmail, replyToAddresses, emailTemplateConfig, user, passwordResetLink };
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

export const sendEarnedCashbackRewardEmail = async ({
  user,
  recipientEmail,
  senderEmail = EmailAddresses.NoReply,
  replyToAddresses = [EmailAddresses.ReplyTo],
  domain = process.env.FRONTEND_DOMAIN,
  companyName,
  name,
  sendEmail = true }: Partial<IEmailVerificationTemplateParams>) => {
  const emailTemplateConfig = EmailTemplateConfigs.EarnedCashbackReward;
  const { isValid, missingFields } = verifyRequiredFields(['companyName', 'domain', 'recipientEmail', 'name'], { companyName, domain, recipientEmail, name });
  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  const template = buildTemplate({ templateName: emailTemplateConfig.name, data: { name, domain, companyName } });
  const subject = 'Great job! You earned a cashback reward.';
  const jobData: IEmailJobData = { template, subject, senderEmail, recipientEmail, replyToAddresses, emailTemplateConfig, user };
  if (sendEmail) EmailBullClient.createJob(JobNames.SendEmail, jobData, defaultEmailJobOptions);
  return { jobData, jobOptions: defaultEmailJobOptions };
};

export const sendCashbackPayoutEmail = async ({
  user,
  recipientEmail,
  senderEmail = EmailAddresses.NoReply,
  replyToAddresses = [EmailAddresses.ReplyTo],
  domain = process.env.FRONTEND_DOMAIN,
  name,
  amount,
  sendEmail = true,
}: Partial<IEmailVerificationTemplateParams>) => {
  const subject = 'Your Karma Cash has been deposited!';
  const emailTemplateConfig = EmailTemplateConfigs.CashbackPayoutNotification;
  const { isValid, missingFields } = verifyRequiredFields(['amount', 'domain', 'recipientEmail', 'name'], { amount, domain, recipientEmail, name });
  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  const template = buildTemplate({ templateName: emailTemplateConfig.name, data: { name, domain, amount } } as IBuildTemplateParams);
  const jobData: IEmailJobData = { template, subject, senderEmail, recipientEmail, replyToAddresses, emailTemplateConfig, user };
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

export const sendSupportTicketEmailToSupport = async ({
  user,
  recipientEmail = 'support@theimpactkarma.com',
  senderEmail = EmailAddresses.NoReply,
  replyToAddresses = [EmailAddresses.ReplyTo],
  message,
  supportTicketId,
}: ISupportEmailVerificationTemplateParams) => {
  const userEmail = user.emails.find(e => !!e.primary).email;
  const { name, _id } = user;
  const emailTemplateConfig = EmailTemplateConfigs.SupportTicket;
  const { isValid, missingFields } = verifyRequiredFields(['user', 'message', 'supportTicketId'], { user, message, supportTicketId });
  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  const template = buildTemplate({ templateName: emailTemplateConfig.name, data: { message, userEmail, name } });
  const subject = `New Support Ticket: ${supportTicketId}`;
  const jobData: IEmailJobData = { template, subject, senderEmail, recipientEmail, replyToAddresses, emailTemplateConfig, user: _id, message, supportTicketId, userEmail };
  EmailBullClient.createJob(JobNames.SendEmail, jobData, defaultEmailJobOptions);
  return { jobData, jobOptions: defaultEmailJobOptions };
};

export const sendDeleteAccountRequestEmail = async ({
  user,
  deleteReason,
  deleteAccountRequestId,
  recipientEmail = 'support@theimpactkarma.com',
  senderEmail = EmailAddresses.NoReply,
  replyToAddresses = [EmailAddresses.ReplyTo],
}: IDeleteAccountRequestVerificationTemplateParams) => {
  const userEmail = user.emails.find(e => !!e.primary)?.email;
  const { name, _id } = user;
  const emailTemplateConfig = EmailTemplateConfigs.AccountDeleteRequest;
  const { isValid, missingFields } = verifyRequiredFields(['user', 'deleteReason', 'deleteAccountRequestId'], { user, deleteReason, deleteAccountRequestId });
  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  const template = buildTemplate({ templateName: emailTemplateConfig.name, data: { deleteReason, userEmail, name } });
  const subject = `New Delete Account Request: ${deleteAccountRequestId}`;
  const jobData: IEmailJobData = { template, subject, senderEmail, recipientEmail, replyToAddresses, emailTemplateConfig, user: _id, deleteReason, deleteAccountRequestId, userEmail };
  EmailBullClient.createJob(JobNames.SendEmail, jobData, defaultEmailJobOptions);
  return { jobData, jobOptions: defaultEmailJobOptions };
};

export const testCashbackPayoutEmail = async (req: IRequest<{}, {}, {}>) => {
  try {
    const { _id } = req.requestor;
    if (!_id) throw new CustomError('A user id is required.', ErrorTypes.INVALID_ARG);
    const user = await UserModel.findById(_id);
    if (!user) throw new CustomError(`No user with id ${_id} was found.`, ErrorTypes.NOT_FOUND);
    const { email } = user.emails.find(e => !!e.primary);
    if (!email) throw new CustomError(`No primary email found for user ${_id}.`, ErrorTypes.NOT_FOUND);
    const emailResponse = await sendCashbackPayoutEmail({
      user: user._id,
      recipientEmail: email,
      name: user.name,
      amount: '10.44',
    });
    if (!!emailResponse) {
      return 'Email sent successfully';
    }
  } catch (err) {
    throw asCustomError(err);
  }
};
