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

export interface ICreateJobParams {
  name: string,
  data?: any
}

export const sendGroupVerificationEmail = async (req: IRequest<{}, {}, ISendGroupVerificationEmailParams>) => {
  const {
    name, domain, token, groupName, recipientEmail,
  } = req.body;
  const template = await EmailService.sendGroupVerificationEmail({
    name, domain, token, groupName, recipientEmail,
  });
  return template;
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
