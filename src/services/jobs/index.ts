import { IRequest } from '../../types/request';
import * as EmailService from '../email';
import { MainBullClient } from '../../clients/bull/main';

export interface ISendGroupVerificationEmailParams {
  name: string;
  domain: string;
  groupName: string;
  recipientEmail: string;
  token: string;
}

export interface ISendEmailVerificationParams {
  name: string;
  domain: string;
  recipientEmail: string;
  token: string;
}

export interface ISendWelcomeEmailParams {
  name: string;
  domain: string;
  recipientEmail: string;
  token: string;
}

export interface ICreateJobParams {
  name: string,
  data?: any
}

export const sendGroupVerificationEmail = async (req: IRequest<{}, {}, ISendGroupVerificationEmailParams>) => {
  const {
    name, domain, token, groupName, recipientEmail,
  } = req.body;
  await EmailService.sendGroupVerificationEmail({
    name, domain, token, groupName, recipientEmail,
  });
  return 'Job added to queue';
};

export const sendAltEmailVerificationEmail = async (req: IRequest<{}, {}, ISendEmailVerificationParams>) => {
  const {
    name, domain, token, recipientEmail,
  } = req.body;
  await EmailService.sendEmailVerification({
    name, domain, token, recipientEmail, emailType: EmailService.EmailTypes.Alt,
  });
  return 'Job added to queue';
};

export const sendPrimaryEmailVerification = async (req: IRequest<{}, {}, ISendEmailVerificationParams>) => {
  const {
    name, domain, token, recipientEmail,
  } = req.body;
  await EmailService.sendEmailVerification({
    name, domain, token, recipientEmail, emailType: EmailService.EmailTypes.Primary,
  });
  return 'Job added to queue';
};

export const sendWelcomeEmail = async (req: IRequest<{}, {}, ISendWelcomeEmailParams>) => {
  const {
    name, domain, token, recipientEmail,
  } = req.body;
  await EmailService.sendWelcomeEmail({
    name, domain, token, recipientEmail,
  });
  return 'Job added to queue';
};

export const createJob = async (req: IRequest<{}, {}, ICreateJobParams>) => {
  const {
    name,
    data,
  } = req.body;
  MainBullClient.createJob(name, data);
  return 'Job added to queue';
};

// TODO: Update to make sure we have all job statuses needed
export const logJobs = async (_: IRequest) => MainBullClient.queue.getJobs(['wait', 'delayed']);

export const obliterateQueue = async (_: IRequest) => {
  await MainBullClient.queue.obliterate();
  return 'Queue obliterated';
};

export const addCronJobs = async (_: IRequest) => {
  await MainBullClient.initCronJobs();
  return 'Cron jobs added';
};
