import Handlebars from 'handlebars';
import path from 'path';
import fs from 'fs';
import { MainBullClient } from '../../clients/bull/main';
import { JobNames } from '../../lib/constants/jobScheduler';
import { EmailAddresses, ErrorTypes } from '../../lib/constants';
import CustomError from '../../lib/customError';
import { verifyRequiredFields } from '../../lib/requestData';
import { colors } from '../../lib/colors';

// values for EmailTemplates should map to the directory names in /src/templates/email/
export enum EmailTemplates {
  GroupVerification = 'groupVerification',
  EmailVerification = 'emailVerification',
  Welcome = 'welcome'
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

interface IGroupVerificationTemplateParams {
  name: string;
  domain?: string;
  token: string;
  groupName: string;
  recipientEmail: string;
  senderEmail?: string;
  replyToAddresses?: string[];
}

interface IEmailVerificationTemplateParams {
  name: string;
  domain?: string;
  token: string;
  recipientEmail: string;
  senderEmail?: string;
  replyToAddresses?: string[];
}

interface IWelcomeEmailTemplateParams {
  name: string;
  domain?: string;
  token: string;
  recipientEmail: string;
  senderEmail?: string;
  replyToAddresses?: string[];
}

export const sendGroupVerificationEmail = async ({
  name, domain = process.env.FRONTEND_DOMAIN, token, groupName, recipientEmail, senderEmail = EmailAddresses.NoReply, replyToAddresses = [EmailAddresses.ReplyTo],
}: IGroupVerificationTemplateParams) => {
  const { isValid, missingFields } = verifyRequiredFields(['name', 'domain', 'token', 'groupName', 'recipientEmail'], {
    name, domain, token, groupName, recipientEmail,
  });
  if (!isValid) {
    throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  }
  const verificationLink = `${domain}/account?emailVerification=${token}`;
  const template = buildTemplate(EmailTemplates.GroupVerification, {
    verificationLink, name, token, groupName,
  });
  const subject = 'KarmaWallet Email Verification';
  const jobData = {
    template, subject, senderEmail, recipientEmail, replyToAddresses,
  };
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
  name,
  domain = process.env.FRONTEND_DOMAIN,
  token,
  recipientEmail,
  senderEmail = EmailAddresses.NoReply,
  replyToAddresses = [EmailAddresses.ReplyTo],
}: IEmailVerificationTemplateParams) => {
  const { isValid, missingFields } = verifyRequiredFields(['name', 'domain', 'token', 'recipientEmail'], {
    name, domain, token, recipientEmail,
  });
  if (!isValid) {
    throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  }
  // TODO: verify param FE/UI will be using to verify
  const verificationLink = `${domain}/account?emailVerification=${token}`;
  const template = buildTemplate(EmailTemplates.EmailVerification, {
    verificationLink, name, token,
  });
  const subject = 'KarmaWallet Email Verification';
  const jobData = {
    template, subject, senderEmail, recipientEmail, replyToAddresses,
  };
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
  name,
  domain = process.env.FRONTEND_DOMAIN,
  token,
  recipientEmail,
  senderEmail = EmailAddresses.NoReply,
  replyToAddresses = [EmailAddresses.ReplyTo],
}: IWelcomeEmailTemplateParams) => {
  const { isValid, missingFields } = verifyRequiredFields(['name', 'domain', 'token', 'recipientEmail'], {
    name, domain, token, recipientEmail,
  });
  if (!isValid) {
    throw new CustomError(`Fields ${missingFields.join(', ')} are required`, ErrorTypes.INVALID_ARG);
  }
  const verificationLink = `${domain}/account?emailVerification=${token}`;
  const template = buildTemplate(EmailTemplates.Welcome, {
    verificationLink, name, token,
  });
  const subject = 'Welcome to KarmaWallet!';
  const jobData = {
    template, subject, senderEmail, recipientEmail, replyToAddresses,
  };
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
