import { IRequest } from '../../types/request';
import * as EmailService from '../email';
import { MainBullClient } from '../../clients/bull/main';

interface ISendGroupVerificationEmail {
  name: string;
  domain: string;
  groupName: string;
  recipientEmail: string;
  token: string;
}

export const sendGroupVerificationEmail = async (req: IRequest<{}, {}, ISendGroupVerificationEmail>) => {
  const {
    name, domain, token, groupName, recipientEmail,
  } = req.body;
  await EmailService.sendGroupVerificationEmail({
    name, domain, token, groupName, recipientEmail,
  });
  return 'Group verification email added to queue';
};

export const createJob = async (req: IRequest<{}, {}, { name: string, data?: any}>) => {
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
