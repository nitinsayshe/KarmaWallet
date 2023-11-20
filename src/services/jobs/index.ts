import { Types } from 'mongoose';
import { IRequest } from '../../types/request';
import * as EmailService from '../email';
import * as EmailTypes from '../email/types';
import { MainBullClient } from '../../clients/bull/main';
import { EmailBullClient } from '../../clients/bull/email';
import CustomError from '../../lib/customError';
import { ErrorTypes } from '../../lib/constants';
import { QueueNames } from '../../lib/constants/jobScheduler';
import { onComplete } from '../../jobs/userPlaidTransactionMap';

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

export interface IQueueQuery {
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

export const populateEmailTemplate = async (req: IRequest<{}, {}, Partial<EmailTypes.IPopulateEmailTemplateRequest>>) => EmailService.populateEmailTemplate(req);

export const createJob = (req: IRequest<{}, {}, ICreateJobParams>) => {
  const { name, data, queue } = req.body;
  switch (queue) {
    case QueueNames.Main:
      MainBullClient.createJob(name, data, null, { onComplete });
      break;
    case QueueNames.Email:
      EmailBullClient.createJob(name, data);
      break;
    default:
      throw new CustomError('Invalid queue name', ErrorTypes.INVALID_ARG);
  }
  return 'Job added to queue';
};

export const logJobs = async (_: IRequest) => MainBullClient.queue.getJobs(['active', 'waiting', 'wait', 'repeat', 'delayed']);

export const obliterateQueue = async (req: IRequest<{}, IQueueQuery, {}>) => {
  const { queue } = req.query;
  switch (queue) {
    case QueueNames.Main:
      await MainBullClient.queue.obliterate();
      break;
    case QueueNames.Email:
      await EmailBullClient.queue.obliterate();
      break;
    default:
      throw new CustomError('Invalid queue name', ErrorTypes.INVALID_ARG);
  }
  return { message: `${queue} queue obliterated` };
};

export const addCronJobs = async (req: IRequest<{}, IQueueQuery, {}>) => {
  const { queue } = req.query;
  switch (queue) {
    case QueueNames.Main:
      await MainBullClient.initCronJobs();
      break;
    case QueueNames.Email:
      await EmailBullClient.initCronJobs();
      break;
    default:
      throw new CustomError('Invalid queue name', ErrorTypes.INVALID_ARG);
  }
  return 'Cron jobs added';
};
