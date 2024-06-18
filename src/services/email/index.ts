/* eslint-disable prefer-rest-params */
import dayjs from 'dayjs';
import fs from 'fs';
import Handlebars from 'handlebars';
import path from 'path';
import { EmailBullClient } from '../../clients/bull/email';
import { colors } from '../../lib/colors';
import { EmailAddresses, ErrorTypes } from '../../lib/constants';
import { EmailTemplateConfigs, EmailTemplateTypes } from '../../lib/constants/email';
import { JobNames } from '../../lib/constants/jobScheduler';
import CustomError from '../../lib/customError';
import { registerHandlebarsOperators } from '../../lib/registerHandlebarsOperators';
import { verifyRequiredFields } from '../../lib/requestData';
import { SentEmailModel } from '../../models/sentEmail';
import { IRequest } from '../../types/request';
import { IACHTransferEmailData, IBankLinkedConfirmationEmailTemplate, IBuildTemplateParams, IChangeEmailAffirmationParams, IChangeEmailConfirmationParams, IContactUsEmail, ICreateSentEmailParams, IDeleteAccountRequestVerificationTemplateParams, IDisputeEmailData, IEmailJobData, IEmailVerificationTemplateParams, IEmployerGiftEmailData, IGroupVerificationTemplateParams, IKarmaCardDeclinedEmailData, IKarmaCardUpdateEmailData, IKarmacardWelcomeTemplateParams, IPopulateEmailTemplateRequest, IResumeKarmaCardApplicationEmail, ISendTransactionsProcessedEmailParams, ISupportEmailVerificationTemplateParams, IWelcomeGroupTemplateParams, ILowBalanceTemplateParams } from './types';

registerHandlebarsOperators(Handlebars);

// tries 3 times, after 4 sec, 16 sec, and 64 sec
const defaultEmailJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 4000,
  },
};

export const buildTemplate = ({ templateName, data, templatePath, templateType }: IBuildTemplateParams) => {
  // Add Template Content and Styles for this particular email
  const _bodyPath = templatePath || path.join(__dirname, '..', '..', 'templates', 'email', templateName, 'template.hbs');
  const _templateStylePath = path.join(__dirname, '..', '..', 'templates', 'email', templateName, 'style.hbs');
  if (!fs.existsSync(_bodyPath)) throw new CustomError('Template not found for email', ErrorTypes.INVALID_ARG);
  const bodyString = fs.readFileSync(_bodyPath, 'utf8');
  Handlebars.registerPartial('body', bodyString);

  if (templateType === EmailTemplateTypes.Dispute) {
    const _disputesSignatureTemplatePath = path.join(__dirname, '..', '..', 'templates', 'email', 'shareableTemplates', 'disputeSignature', 'template.hbs');
    if (!fs.existsSync(_disputesSignatureTemplatePath)) throw new CustomError('Dispute signature template not found', ErrorTypes.INVALID_ARG);
    const disputeString = fs.readFileSync(_disputesSignatureTemplatePath, 'utf8');
    Handlebars.registerPartial('disputeSignature', disputeString);
  }

  if (fs.existsSync(_templateStylePath)) {
    const rawCss = fs.readFileSync(_templateStylePath, 'utf8');
    const styleTemplateRaw = Handlebars.compile(rawCss);
    const styleTemplate = styleTemplateRaw({ colors });
    data.templateStyle = styleTemplate;
  }

  // Add shared Footer Content and Styles
  const _footerPath = path.join(__dirname, '..', '..', 'templates', 'email', 'shareableTemplates', 'footer', 'template.hbs');
  const _footerStylePath = path.join(__dirname, '..', '..', 'templates', 'email', 'shareableTemplates', 'footer', 'style.hbs');
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
    name,
    domain,
    token,
    groupName,
    recipientEmail,
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
  const { isValid, missingFields } = verifyRequiredFields(['name', 'domain', 'token', 'recipientEmail'], {
    name,
    domain,
    token,
    recipientEmail,
  });
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

export const sendChangeEmailRequestAffirmationEmail = async ({
  user,
  recipientEmail,
  token,
  domain = process.env.FRONTEND_DOMAIN,
  replyToAddresses = [EmailAddresses.ReplyTo],
  senderEmail = EmailAddresses.NoReply,
  sendEmail = true,
  name,
}: IChangeEmailAffirmationParams) => {
  const emailTemplateConfig = EmailTemplateConfigs.ChangeEmailRequestAffirmation;
  const { isValid, missingFields } = verifyRequiredFields(['name', 'domain', 'token', 'recipientEmail'], {
    name,
    domain,
    token,
    recipientEmail,
  });

  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);

  const affirmationLink = `${domain}?affirmEmailChange=${token}`;

  const template = buildTemplate({ templateName: emailTemplateConfig.name, data: { affirmationLink, name } });
  console.log(template);
  const subject = 'Complete your Email Address Change Request';
  const jobData: IEmailJobData = { template, subject, senderEmail, recipientEmail, replyToAddresses, emailTemplateConfig, user };
  console.log(jobData);
  if (sendEmail) EmailBullClient.createJob(JobNames.SendEmail, jobData, defaultEmailJobOptions);
  return { jobData, jobOptions: defaultEmailJobOptions };
};

export const sendChangeEmailRequestConfirmationEmail = async ({
  user,
  recipientEmail,
  token,
  domain = process.env.FRONTEND_DOMAIN,
  replyToAddresses = [EmailAddresses.ReplyTo],
  senderEmail = EmailAddresses.NoReply,
  sendEmail = true,
  name,
}: IChangeEmailConfirmationParams) => {
  const emailTemplateConfig = EmailTemplateConfigs.ChangeEmailRequestVerification;
  const { isValid, missingFields } = verifyRequiredFields(['name', 'domain', 'token', 'recipientEmail'], {
    name,
    domain,
    token,
    recipientEmail,
  });

  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);

  const verificationLink = `${domain}?verifyEmailChange=${token}`;

  const template = buildTemplate({ templateName: emailTemplateConfig.name, data: { verificationLink, name, token } });
  const subject = 'Verify your Email Address Change Request';
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
  const { isValid, missingFields } = verifyRequiredFields(['name', 'domain', 'token', 'recipientEmail'], {
    name,
    domain,
    token,
    recipientEmail,
  });
  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  const urlParamsString = visitor.integrations.urlParams.map((param) => `${param.key}=${param.value}`).join('&');
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
  const jobData: IEmailJobData = {
    template,
    subject,
    senderEmail,
    recipientEmail,
    replyToAddresses,
    emailTemplateConfig,
    user,
    passwordResetLink,
  };
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
  const { isValid, missingFields } = verifyRequiredFields(['name', 'domain', 'token', 'recipientEmail'], {
    name,
    domain,
    token,
    recipientEmail,
  });
  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  const params = visitor.integrations.urlParams.filter((p) => p.key !== 'createaccount');
  const urlParamsString = params.map((param) => `${param.key}=${param.value}`).join('&');
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
  const jobData: IEmailJobData = {
    template,
    subject,
    senderEmail,
    recipientEmail,
    replyToAddresses,
    emailTemplateConfig,
    user,
    isSuccess,
    name,
  };
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
  sendEmail = true,
}: IEmailVerificationTemplateParams) => {
  const emailTemplateConfig = EmailTemplateConfigs.PasswordReset;
  const { isValid, missingFields } = verifyRequiredFields(['token', 'domain', 'recipientEmail', 'name'], {
    token,
    domain,
    recipientEmail,
    name,
  });
  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  const passwordResetLink = `${domain}/?createpassword=${token}`;
  const template = buildTemplate({ templateName: emailTemplateConfig.name, data: { name, domain, passwordResetLink } });
  const subject = 'Reset your Karma Wallet Password';
  const jobData: IEmailJobData = {
    template,
    subject,
    senderEmail,
    recipientEmail,
    replyToAddresses,
    emailTemplateConfig,
    user,
    passwordResetLink,
  };
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
  sendEmail = true,
}: Partial<IEmailVerificationTemplateParams>) => {
  const emailTemplateConfig = EmailTemplateConfigs.EarnedCashbackReward;
  const { isValid, missingFields } = verifyRequiredFields(['companyName', 'domain', 'recipientEmail', 'name'], {
    companyName,
    domain,
    recipientEmail,
    name,
  });
  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  const template = buildTemplate({ templateName: emailTemplateConfig.name, data: { name, domain, companyName } });
  const subject = 'Great job! You earned a cashback reward.';
  const jobData: IEmailJobData = { template, subject, senderEmail, recipientEmail, replyToAddresses, emailTemplateConfig, user };
  if (sendEmail) EmailBullClient.createJob(JobNames.SendEmail, jobData, defaultEmailJobOptions);
  return { jobData, jobOptions: defaultEmailJobOptions };
};

export const sendCaseLostProvisionalCreditAlreadyIssuedEmail = async ({
  user,
  recipientEmail,
  senderEmail = EmailAddresses.NoReply,
  replyToAddresses = [EmailAddresses.ReplyTo],
  domain = process.env.FRONTEND_DOMAIN,
  name,
  amount,
  reversalDate,
  date,
  companyName,
  reason,
  sendEmail = true,
}: IDisputeEmailData) => {
  const subject = 'Case Lost - Provisional Credit Will Be Reversed';
  const emailTemplateConfig = EmailTemplateConfigs.CaseLostProvisionalCreditAlreadyIssued;
  const { isValid, missingFields } = verifyRequiredFields(
    ['amount', 'domain', 'recipientEmail', 'name', 'amount', 'date', 'reversalDate', 'companyName', 'reason'],
    { amount, domain, recipientEmail, name, date, reversalDate, companyName, reason },
  );
  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  const template = buildTemplate({
    templateName: emailTemplateConfig.name,
    templateType: emailTemplateConfig.type,
    data: { name, domain, amount, companyName, reversalDate, date, reason },
  } as IBuildTemplateParams);
  const jobData: IEmailJobData = { template, subject, senderEmail, recipientEmail, replyToAddresses, emailTemplateConfig, user: user._id.toString() };
  if (sendEmail) EmailBullClient.createJob(JobNames.SendEmail, jobData, defaultEmailJobOptions);
  return { jobData, jobOptions: defaultEmailJobOptions };
};

export const sendCaseLostProvisionalCreditNotAlreadyIssuedEmail = async ({
  user,
  recipientEmail,
  senderEmail = EmailAddresses.NoReply,
  replyToAddresses = [EmailAddresses.ReplyTo],
  domain = process.env.FRONTEND_DOMAIN,
  name,
  amount,
  date,
  companyName,
  reason,
  sendEmail = true,
}: IDisputeEmailData) => {
  const subject = 'Dispute Case Lost';
  const emailTemplateConfig = EmailTemplateConfigs.CaseLostProvisionalCreditNotAlreadyIssued;
  const { isValid, missingFields } = verifyRequiredFields(
    ['amount', 'domain', 'recipientEmail', 'name', 'amount', 'date', 'companyName', 'reason'],
    { amount, domain, recipientEmail, name, date, companyName, reason },
  );
  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  const template = buildTemplate({
    templateName: emailTemplateConfig.name,
    templateType: emailTemplateConfig.type,
    data: { name, domain, amount, companyName, date, reason },
  } as IBuildTemplateParams);
  const jobData: IEmailJobData = { template, subject, senderEmail, recipientEmail, replyToAddresses, emailTemplateConfig, user: user._id.toString() };
  if (sendEmail) EmailBullClient.createJob(JobNames.SendEmail, jobData, defaultEmailJobOptions);
  return { jobData, jobOptions: defaultEmailJobOptions };
};

export const sendCaseWonProvisionalCreditAlreadyIssuedEmail = async ({
  user,
  recipientEmail,
  senderEmail = EmailAddresses.NoReply,
  replyToAddresses = [EmailAddresses.ReplyTo],
  domain = process.env.FRONTEND_DOMAIN,
  name,
  amount,
  merchantName,
  submittedClaimDate,
  sendEmail = true,
}: Partial<IEmailVerificationTemplateParams>) => {
  const subject = 'Your dispute case has been won!';
  const emailTemplateConfig = EmailTemplateConfigs.CaseWonProvisionalCreditAlreadyIssued;
  const { isValid, missingFields } = verifyRequiredFields(
    ['amount', 'domain', 'recipientEmail', 'name', 'merchantName', 'submittedClaimDate'],
    { amount, domain, recipientEmail, name, merchantName, submittedClaimDate },
  );
  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  const template = buildTemplate({
    templateName: emailTemplateConfig.name,
    templateType: emailTemplateConfig.type,
    data: { name, domain, amount, merchantName, submittedClaimDate },
  } as IBuildTemplateParams);
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
  const { isValid, missingFields } = verifyRequiredFields(['amount', 'domain', 'recipientEmail', 'name'], {
    amount,
    domain,
    recipientEmail,
    name,
  });
  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  const template = buildTemplate({ templateName: emailTemplateConfig.name, data: { name, domain, amount } } as IBuildTemplateParams);
  const jobData: IEmailJobData = { template, subject, senderEmail, recipientEmail, replyToAddresses, emailTemplateConfig, user };
  if (sendEmail) EmailBullClient.createJob(JobNames.SendEmail, jobData, defaultEmailJobOptions);
  return { jobData, jobOptions: defaultEmailJobOptions };
};

// Welcome email when karma card is approved
export const sendKarmaCardWelcomeEmail = async ({
  name,
  user,
  newUser,
  domain = process.env.FRONTEND_DOMAIN,
  recipientEmail,
  senderEmail = EmailAddresses.NoReply,
  replyToAddresses = [EmailAddresses.ReplyTo],
  sendEmail = true,
}: IKarmacardWelcomeTemplateParams) => {
  const emailTemplateConfig = EmailTemplateConfigs.KarmaCardWelcome;
  const { isValid, missingFields } = verifyRequiredFields(['domain', 'recipientEmail', 'name', 'newUser'], { domain, recipientEmail, name, newUser });
  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  const template = buildTemplate({ templateName: emailTemplateConfig.name, data: { name, domain, newUser } });
  const subject = 'Welcome to Karma Wallet!';
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
  recipientEmail = 'support@karmawallet.io',
  senderEmail = EmailAddresses.NoReply,
  replyToAddresses = [EmailAddresses.ReplyTo],
  message,
  supportTicketId,
}: ISupportEmailVerificationTemplateParams) => {
  const userEmail = user.emails.find((e) => !!e.primary).email;
  const { name, _id } = user;
  const emailTemplateConfig = EmailTemplateConfigs.SupportTicket;
  const { isValid, missingFields } = verifyRequiredFields(['user', 'message', 'supportTicketId'], { user, message, supportTicketId });
  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  const template = buildTemplate({ templateName: emailTemplateConfig.name, data: { message, userEmail, name } });
  const subject = `New Support Ticket: ${supportTicketId}`;
  const jobData: IEmailJobData = {
    template,
    subject,
    senderEmail,
    recipientEmail,
    replyToAddresses,
    emailTemplateConfig,
    user: _id,
    message,
    supportTicketId,
    userEmail,
  };
  EmailBullClient.createJob(JobNames.SendEmail, jobData, defaultEmailJobOptions);
  return { jobData, jobOptions: defaultEmailJobOptions };
};

export const sendDeleteAccountRequestEmail = async ({
  user,
  deleteReason,
  deleteAccountRequestId,
  recipientEmail = 'support@karmawallet.io',
  senderEmail = EmailAddresses.NoReply,
  replyToAddresses = [EmailAddresses.ReplyTo],
}: IDeleteAccountRequestVerificationTemplateParams) => {
  const userEmail = user.emails.find((e) => !!e.primary)?.email;
  const { name, _id } = user;
  const emailTemplateConfig = EmailTemplateConfigs.AccountDeleteRequest;
  const { isValid, missingFields } = verifyRequiredFields(['user', 'deleteReason', 'deleteAccountRequestId'], {
    user,
    deleteReason,
    deleteAccountRequestId,
  });
  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  const template = buildTemplate({ templateName: emailTemplateConfig.name, data: { deleteReason, userEmail, name } });
  const subject = `New Delete Account Request: ${deleteAccountRequestId}`;
  const jobData: IEmailJobData = {
    template,
    subject,
    senderEmail,
    recipientEmail,
    replyToAddresses,
    emailTemplateConfig,
    user: _id,
    deleteReason,
    deleteAccountRequestId,
    userEmail,
  };
  EmailBullClient.createJob(JobNames.SendEmail, jobData, defaultEmailJobOptions);
  return { jobData, jobOptions: defaultEmailJobOptions };
};

export const sendACHCancelledEmail = async ({
  user,
  amount,
  accountMask,
  accountType,
  date,
  name,
}: IACHTransferEmailData) => {
  const emailTemplateConfig = EmailTemplateConfigs.ACHTransferCancelled;
  const subject = 'An ACH Transfer Has Been Cancelled';
  const senderEmail = EmailAddresses.NoReply;
  const replyToAddresses = [EmailAddresses.ReplyTo];
  const recipientEmail = user.emails.find(e => !!e.primary)?.email;
  const { isValid, missingFields } = verifyRequiredFields(['amount', 'accountMask', 'accountType', 'date', 'name'], { amount, accountMask, accountType, date, name });

  if (!isValid) {
    throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  }
  const template = buildTemplate({
    templateName: emailTemplateConfig.name,
    data: { amount, accountMask, accountType, date, name },
  });

  const jobData: IEmailJobData = {
    template,
    recipientEmail,
    subject,
    senderEmail,
    replyToAddresses,
    emailTemplateConfig,
    user: user._id,
    amount,
    accountMask,
    accountType,
    date,
    name,
  };

  EmailBullClient.createJob(JobNames.SendEmail, jobData, defaultEmailJobOptions);
  return { jobData, jobOptions: defaultEmailJobOptions };
};

export const sendACHReturnedEmail = async ({
  user,
  amount,
  accountMask,
  accountType,
  date,
  name,
  reason,
}: IACHTransferEmailData) => {
  const emailTemplateConfig = EmailTemplateConfigs.ACHTransferReturned;
  const subject = 'An ACH Transfer Has Been Returned';
  const senderEmail = EmailAddresses.NoReply;
  const replyToAddresses = [EmailAddresses.ReplyTo];
  const recipientEmail = user.emails.find(e => !!e.primary)?.email;

  const { isValid, missingFields } = verifyRequiredFields(['amount', 'accountMask', 'accountType', 'date', 'name', 'reason'], { amount, accountMask, accountType, date, name, reason });

  if (!isValid) {
    throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  }
  const template = buildTemplate({
    templateName: emailTemplateConfig.name,
    data: { amount, accountMask, accountType, date, name, reason },
  });

  const jobData: IEmailJobData = {
    template,
    recipientEmail,
    subject,
    senderEmail,
    replyToAddresses,
    emailTemplateConfig,
    user: user._id,
    amount,
    accountMask,
    accountType,
    date,
    name,
    reason,
  };

  EmailBullClient.createJob(JobNames.SendEmail, jobData, defaultEmailJobOptions);
  return { jobData, jobOptions: defaultEmailJobOptions };
};

export const sendACHInitiationEmail = async ({
  user,
  amount,
  accountMask,
  accountType,
  date,
  name,
}: IACHTransferEmailData) => {
  const emailTemplateConfig = EmailTemplateConfigs.ACHTransferInitiation;
  const subject = 'An ACH Transfer Has Been Initiated';
  const senderEmail = EmailAddresses.NoReply;
  const replyToAddresses = [EmailAddresses.ReplyTo];
  const recipientEmail = user.emails.find(e => !!e.primary)?.email;

  const { isValid, missingFields } = verifyRequiredFields(['amount', 'accountMask', 'accountType', 'date', 'name'], { amount, accountMask, accountType, date, name });

  if (!isValid) {
    throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  }
  const template = buildTemplate({
    templateName: emailTemplateConfig.name,
    data: { amount, accountMask, accountType, date, name },
  });

  const jobData: IEmailJobData = {
    template,
    recipientEmail,
    subject,
    senderEmail,
    replyToAddresses,
    emailTemplateConfig,
    user: user._id,
    amount,
    accountMask,
    accountType,
    date,
    name,
  };

  EmailBullClient.createJob(JobNames.SendEmail, jobData, defaultEmailJobOptions);
  return { jobData, jobOptions: defaultEmailJobOptions };
};

export const sendNoChargebackRightsEmail = async ({
  user,
  senderEmail = EmailAddresses.NoReply,
  replyToAddresses = [EmailAddresses.ReplyTo],
  domain = process.env.FRONTEND_DOMAIN,
  name,
  companyName,
  amount,
  sendEmail = true,
}: IDisputeEmailData) => {
  const recipientEmail = user.emails.find(e => !!e.primary)?.email;
  const subject = 'Your Karma Wallet Card Dispute Has Been Denied';
  const emailTemplateConfig = EmailTemplateConfigs.NoChargebackRights;

  const { isValid, missingFields } = verifyRequiredFields(['domain', 'recipientEmail', 'name', 'companyName', 'amount'], { domain, recipientEmail, name, companyName, amount });
  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);

  const template = buildTemplate({
    templateName: emailTemplateConfig.name,
    templateType: EmailTemplateTypes.Dispute,
    data: { amount, companyName, name },
  });
  const jobData: IEmailJobData = { template, subject, senderEmail, recipientEmail, replyToAddresses, emailTemplateConfig, user: user._id.toString() };
  if (sendEmail) EmailBullClient.createJob(JobNames.SendEmail, jobData, defaultEmailJobOptions);
  return { jobData, jobOptions: defaultEmailJobOptions };
};

export const sendProvisionalCreditIssuedEmail = async ({
  user,
  senderEmail = EmailAddresses.NoReply,
  replyToAddresses = [EmailAddresses.ReplyTo],
  domain = process.env.FRONTEND_DOMAIN,
  name,
  date,
  amount,
  sendEmail = true,
}: IDisputeEmailData) => {
  const recipientEmail = user.emails.find(e => !!e.primary)?.email;
  const subject = 'Karma Wallet Dispute Created and Provisional Credit Issued';
  const emailTemplateConfig = EmailTemplateConfigs.ProvisionalCreditIssued;

  const { isValid, missingFields } = verifyRequiredFields(['domain', 'recipientEmail', 'name', 'date', 'amount'], { domain, recipientEmail, name, date, amount });
  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);

  const template = buildTemplate({
    templateName: emailTemplateConfig.name,
    templateType: EmailTemplateTypes.Dispute,
    data: { amount, date, name },
  });

  const jobData: IEmailJobData = { template, subject, senderEmail, recipientEmail, replyToAddresses, emailTemplateConfig, user: user._id.toString() };
  if (sendEmail) EmailBullClient.createJob(JobNames.SendEmail, jobData, defaultEmailJobOptions);
  return { jobData, jobOptions: defaultEmailJobOptions };
};

export const sendBankLinkedConfirmationEmail = async ({
  user,
  recipientEmail,
  instituteName,
  lastDigitsOfBankAccountNumber,
  name,
  senderEmail = EmailAddresses.NoReply,
  replyToAddresses = [EmailAddresses.ReplyTo],
  sendEmail = true,
}: IBankLinkedConfirmationEmailTemplate) => {
  const emailTemplateConfig = EmailTemplateConfigs.BankLinkedConfirmation;
  const { isValid, missingFields } = verifyRequiredFields(
    ['recipientEmail', 'name', 'instituteName', 'lastDigitsOfBankAccountNumber'],
    { recipientEmail, name, instituteName, lastDigitsOfBankAccountNumber },
  );
  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  const template = buildTemplate({
    templateName: emailTemplateConfig.name,
    data: { name, instituteName, lastDigitsOfBankAccountNumber },
  });
  const subject = 'Your Bank Account is Successfully Linked';
  const jobData: IEmailJobData = {
    template,
    subject,
    senderEmail,
    recipientEmail,
    replyToAddresses,
    emailTemplateConfig,
    user,
    name,
    instituteName,
    lastDigitsOfBankAccountNumber,
  };
  if (sendEmail) EmailBullClient.createJob(JobNames.SendEmail, jobData, defaultEmailJobOptions);
  return { jobData, jobOptions: defaultEmailJobOptions };
};

export const sendCaseWonProvisionalCreditNotAlreadyIssuedEmail = async ({
  user,
  recipientEmail,
  senderEmail = EmailAddresses.NoReply,
  replyToAddresses = [EmailAddresses.ReplyTo],
  domain = process.env.FRONTEND_DOMAIN,
  name,
  amount,
  date,
  companyName,
  sendEmail = true,
}: IDisputeEmailData) => {
  const subject = 'Case Won - Credit Issued to your Karma Wallet Card';
  const emailTemplateConfig = EmailTemplateConfigs.CaseWonProvisionalCreditNotAlreadyIssued;
  const { isValid, missingFields } = verifyRequiredFields(
    ['amount', 'domain', 'recipientEmail', 'name', 'amount', 'date', 'companyName'],
    { amount, domain, recipientEmail, name, date, companyName },
  );
  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  const template = buildTemplate({
    templateName: emailTemplateConfig.name,
    templateType: emailTemplateConfig.type,
    data: { name, domain, amount, companyName, date },
  } as IBuildTemplateParams);
  const jobData: IEmailJobData = { template, subject, senderEmail, recipientEmail, replyToAddresses, emailTemplateConfig, user: user._id.toString() };
  if (sendEmail) EmailBullClient.createJob(JobNames.SendEmail, jobData, defaultEmailJobOptions);
  return { jobData, jobOptions: defaultEmailJobOptions };
};

export const sendDisputeReceivedNoProvisionalCreditIssuedEmail = async ({
  user,
  recipientEmail,
  senderEmail = EmailAddresses.NoReply,
  replyToAddresses = [EmailAddresses.ReplyTo],
  domain = process.env.FRONTEND_DOMAIN,
  name,
  sendEmail = true,
}: IDisputeEmailData) => {
  const subject = 'Karma Wallet Card Dispute Received';
  const emailTemplateConfig = EmailTemplateConfigs.DisputeReceivedNoProvisionalCreditIssued;
  const { isValid, missingFields } = verifyRequiredFields(
    ['domain', 'recipientEmail', 'name'],
    { domain, recipientEmail, name },
  );
  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  const template = buildTemplate({
    templateName: emailTemplateConfig.name,
    templateType: emailTemplateConfig.type,
    data: { name, domain },
  } as IBuildTemplateParams);
  const jobData: IEmailJobData = { template, subject, senderEmail, recipientEmail, replyToAddresses, emailTemplateConfig, user: user._id.toString() };
  if (sendEmail) EmailBullClient.createJob(JobNames.SendEmail, jobData, defaultEmailJobOptions);
  return { jobData, jobOptions: defaultEmailJobOptions };
};

export const sendCardShippedEmail = async ({
  user,
  recipientEmail,
  senderEmail = EmailAddresses.NoReply,
  replyToAddresses = [EmailAddresses.ReplyTo],
  domain = process.env.FRONTEND_DOMAIN,
  name,
  sendEmail = true,
}: Partial<IEmailVerificationTemplateParams>) => {
  const subject = 'Your Karma Wallet Card Has Shipped!';
  const emailTemplateConfig = EmailTemplateConfigs.CardShipped;
  const { isValid, missingFields } = verifyRequiredFields(['domain', 'recipientEmail', 'name'], { domain, recipientEmail, name });
  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  const template = buildTemplate({ templateName: emailTemplateConfig.name, data: { name, domain } } as IBuildTemplateParams);
  const jobData: IEmailJobData = { template, subject, senderEmail, recipientEmail, replyToAddresses, emailTemplateConfig, user: user._id.toString() };
  if (sendEmail) EmailBullClient.createJob(JobNames.SendEmail, jobData, defaultEmailJobOptions);
  return { jobData, jobOptions: defaultEmailJobOptions };
};

export const sendEmployerGiftEmail = async ({
  user,
  amount,
  recipientEmail,
  name,
  senderEmail = EmailAddresses.NoReply,
  replyToAddresses = [EmailAddresses.ReplyTo],
  domain = process.env.FRONTEND_DOMAIN,
}: IEmployerGiftEmailData) => {
  const subject = "You've received a gift!";
  const emailTemplateConfig = EmailTemplateConfigs.EmployerGift;
  const { isValid, missingFields } = verifyRequiredFields(['domain', 'recipientEmail', 'name', 'amount'], { domain, recipientEmail, name, amount });
  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  const template = buildTemplate({ templateName: emailTemplateConfig.name, data: { name, amount } } as IBuildTemplateParams);
  const jobData: IEmailJobData = { template, subject, senderEmail, recipientEmail, replyToAddresses, emailTemplateConfig, user: user._id.toString() };
  EmailBullClient.createJob(JobNames.SendEmail, jobData, defaultEmailJobOptions);
  return { jobData, jobOptions: defaultEmailJobOptions };
};

export const sendKarmaCardPendingReviewEmail = async ({
  domain = process.env.FRONTEND_DOMAIN,
  name,
  recipientEmail,
  replyToAddresses = [EmailAddresses.ReplyTo],
  sendEmail = true,
  senderEmail = EmailAddresses.NoReply,
  user,
  visitor,
}: IKarmaCardUpdateEmailData) => {
  const emailTemplateConfig = EmailTemplateConfigs.KarmaCardPendingReview;
  const subject = 'Karma Wallet Card Application: Identity Documents Under Review';
  const { isValid, missingFields } = verifyRequiredFields(['domain', 'recipientEmail', 'name'], {
    domain,
    recipientEmail,
    name,
  });
  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  const template = buildTemplate({
    templateName: emailTemplateConfig.name,
    data: { name },
  });
  const jobData: IEmailJobData = {
    template,
    subject,
    senderEmail,
    recipientEmail,
    replyToAddresses,
    emailTemplateConfig,
  };

  if (visitor) jobData.visitor = visitor._id;
  if (user) jobData.user = user._id;

  if (sendEmail) EmailBullClient.createJob(JobNames.SendEmail, jobData, defaultEmailJobOptions);
  return { jobData, jobOptions: defaultEmailJobOptions };
};

export const sendKarmaCardDeclinedEmail = async ({
  domain = process.env.FRONTEND_DOMAIN,
  name,
  recipientEmail,
  replyToAddresses = [EmailAddresses.ReplyTo],
  sendEmail = true,
  senderEmail = EmailAddresses.NoReply,
  user,
  visitor,
  resubmitDocumentsLink,
  applicationExpirationDate,
}: IKarmaCardDeclinedEmailData) => {
  const emailTemplateConfig = EmailTemplateConfigs.KarmaCardDeclined;
  const subject = 'Karma Wallet Card Application';
  const { isValid, missingFields } = verifyRequiredFields(['domain', 'recipientEmail', 'name', 'resubmitDocumentsLink', 'applicationExpirationDate'], {
    domain,
    recipientEmail,
    name,
    resubmitDocumentsLink,
    applicationExpirationDate,
  });
  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  const template = buildTemplate({
    templateName: emailTemplateConfig.name,
    data: { name, resubmitDocumentsLink, applicationExpirationDate },
  });
  const jobData: IEmailJobData = {
    template,
    subject,
    senderEmail,
    recipientEmail,
    replyToAddresses,
    emailTemplateConfig,
  };

  if (visitor) jobData.visitor = visitor._id;
  if (user) jobData.user = user._id;

  if (sendEmail) EmailBullClient.createJob(JobNames.SendEmail, jobData, defaultEmailJobOptions);
  return { jobData, jobOptions: defaultEmailJobOptions };
};

export const sendContactUsEmail = async ({
  department,
  recipientEmail,
  senderEmail = EmailAddresses.NoReply,
  replyToAddresses = [EmailAddresses.ReplyTo],
  firstName,
  lastName,
  email,
  topic,
  message,
  visitor,
  user,
  phone,
}: IContactUsEmail) => {
  const emailTemplateConfig = EmailTemplateConfigs.ContactUs;
  const { isValid, missingFields } = verifyRequiredFields(['firstName', 'email', 'topic', 'message'], {
    recipientEmail,
    firstName,
    topic,
    message,
    email,
  });

  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);

  const name = `${firstName}${lastName ? ` ${lastName}` : ''}`;

  const template = buildTemplate({
    templateName: emailTemplateConfig.name,
    data: { userEmail: email, name, reason: topic, message, department, phone },
  });

  const subject = `New Contact Us Submission - ${topic}`;
  const jobData: IEmailJobData = {
    user,
    visitor,
    template,
    subject,
    senderEmail,
    recipientEmail,
    replyToAddresses,
    emailTemplateConfig,
  };

  EmailBullClient.createJob(JobNames.SendEmail, jobData, defaultEmailJobOptions);
  return { jobData, jobOptions: defaultEmailJobOptions };
};

export const sendResumeKarmaCardApplicationEmail = async ({
  visitor,
  user,
  recipientEmail,
  senderEmail = EmailAddresses.NoReply,
  replyToAddresses = [EmailAddresses.ReplyTo],
  link,
}: IResumeKarmaCardApplicationEmail) => {
  const emailTemplateConfig = EmailTemplateConfigs.ResumeKarmaCardApplication;
  const { isValid, missingFields } = verifyRequiredFields(['link', 'recipientEmail'], { link, recipientEmail });
  if (!isValid) throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  const template = buildTemplate({ templateName: emailTemplateConfig.name, data: { link } });
  const subject = 'Complete Your Karma Wallet Card Application';
  const jobData: IEmailJobData = {
    template,
    subject,
    senderEmail,
    recipientEmail,
    replyToAddresses,
    emailTemplateConfig,
  };
  if (visitor) jobData.visitor = visitor._id;
  if (user) jobData.user = user._id;
  EmailBullClient.createJob(JobNames.SendEmail, jobData, defaultEmailJobOptions);
  return { jobData, jobOptions: defaultEmailJobOptions };
};

export const sendLowBalanceEmail = async ({
  user,
  recipientEmail,
  senderEmail = EmailAddresses.NoReply,
  replyToAddresses = [EmailAddresses.ReplyTo],
  domain = process.env.FRONTEND_DOMAIN,
  name,
  sendEmail = true,
}: ILowBalanceTemplateParams) => {
  const subject = 'It\'s Time to Reload your Karma Wallet Card';
  const emailTemplateConfig = EmailTemplateConfigs.LowBalance;

  const { isValid, missingFields } = verifyRequiredFields(
    ['domain', 'recipientEmail', 'name'],
    { domain, recipientEmail, name },
  );
  if (!isValid) {
    throw new CustomError(
      `Fields ${missingFields.join(', ')} are required`,
      ErrorTypes.INVALID_ARG,
    );
  }
  const template = buildTemplate({
    templateName: emailTemplateConfig.name,
    data: { name, domain },
  });
  const jobData: IEmailJobData = {
    template,
    subject,
    senderEmail,
    recipientEmail,
    replyToAddresses,
    emailTemplateConfig,
    user,
  };

  if (sendEmail) {
    EmailBullClient.createJob(
      JobNames.SendEmail,
      jobData,
      defaultEmailJobOptions,
    );
  }
  return { jobData, jobOptions: defaultEmailJobOptions };
};
