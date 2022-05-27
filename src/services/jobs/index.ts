import { Types } from 'mongoose';
import { IRequest } from '../../types/request';
import * as EmailService from '../email';
import { MainBullClient } from '../../clients/bull/main';
import { EmailBullClient } from '../../clients/bull/email';
import CustomError from '../../lib/customError';
import { ErrorTypes } from '../../lib/constants';
import { QueueNames } from '../../lib/constants/jobScheduler';

export interface ISendEmailParams {
  name: string;
  domain: string;
  recipientEmail: string;
  user: string;
}

export interface ISendVerificationEmailParams extends ISendEmailParams {
  token: string;
}

export interface ISendGroupVerificationEmailParams extends ISendVerificationEmailParams {
  groupName: string;
}

export interface ICreateJobParams {
  name: string,
  data?: any,
  queue: QueueNames
}

export const sendGroupVerificationEmail = async (req: IRequest<{}, {}, ISendGroupVerificationEmailParams>) => {
  const { name, domain, token, groupName, recipientEmail, user } = req.body;
  await EmailService.sendGroupVerificationEmail({ name, domain, token, groupName, recipientEmail, user: new Types.ObjectId(user) });
  return 'Job added to queue';
};

export const sendEmailVerification = async (req: IRequest<{}, {}, ISendVerificationEmailParams>) => {
  const { name, domain, token, recipientEmail, user } = req.body;
  await EmailService.sendEmailVerification({ name, domain, token, recipientEmail, user: new Types.ObjectId(user) });
  return 'Job added to queue';
};

export const sendWelcomeEmail = async (req: IRequest<{}, {}, ISendEmailParams>) => {
  const { name, domain, recipientEmail, user } = req.body;
  await EmailService.sendWelcomeEmail({ name, domain, recipientEmail, user: new Types.ObjectId(user) });
  return 'Job added to queue';
};

export const populateEmailTemplate = async (req: IRequest<{}, {}, Partial<EmailService.IPopulateEmailTemplateRequest>>) => EmailService.populateEmailTemplate(req);

export const createJob = async (req: IRequest<{}, {}, ICreateJobParams>) => {
  const { name, data, queue } = req.body;
  switch (queue) {
    case QueueNames.Main:
      console.log('>>>>> create job controller', name, data);
      await MainBullClient.createJob(name, data);
      break;
    case QueueNames.Email:
      await EmailBullClient.createJob(name, data);
      break;
    default:
      throw new CustomError('Invalid queue name', ErrorTypes.INVALID_ARG);
  }
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
