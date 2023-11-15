import { IRequestHandler } from '../../types/request';
import * as output from '../../services/output';
import { asCustomError } from '../../lib/customError';
import * as JobService from '../../services/jobs';

export const sendGroupVerificationEmail: IRequestHandler<{}, {}, JobService.ISendGroupVerificationEmailParams> = async (req, res) => {
  try {
    const message = await JobService.sendGroupVerificationEmail(req);
    output.api(req, res, message);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const sendEmailVerification: IRequestHandler<{}, {}, JobService.ISendVerificationEmailParams> = async (req, res) => {
  try {
    const message = await JobService.sendEmailVerification(req);
    output.api(req, res, message);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const createJob: IRequestHandler<{}, {}, JobService.ICreateJobParams> = (req, res) => {
  try {
    const message = JobService.createJob(req);
    output.api(req, res, message);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const logJobs: IRequestHandler = async (req, res) => {
  try {
    const jobs = await JobService.logJobs(req);
    output.api(req, res, jobs);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const obliterateQueue: IRequestHandler<{}, JobService.IQueueQuery, {}> = async (req, res) => {
  try {
    const message = await JobService.obliterateQueue(req);
    output.api(req, res, message);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const addCronJobs: IRequestHandler<{}, JobService.IQueueQuery, {}> = async (req, res) => {
  try {
    const message = await JobService.addCronJobs(req);
    output.api(req, res, message);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
