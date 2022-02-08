import aqp from 'api-query-params';
import * as JobsService from '../services/jobs';
import { api, error } from '../services/output';
import { asCustomError } from '../lib/customError';
import { IRequestHandler } from '../types/request';
import { IJob } from '../models/job';

export const createJob: IRequestHandler<{}, {}, Partial<IJob>> = async (req, res) => {
  try {
    const {
      title,
      instructions,
      description,
      department,
      jobLocation,
    } = req.body;
    const job = await JobsService.createJob(req, title, instructions, description, department, jobLocation);
    api(req, res, JobsService.getShareableJob(job));
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};

export const getJobs: IRequestHandler = async (req, res) => {
  try {
    const query = aqp(req.query, { skipKey: 'page' });
    const jobs = await JobsService.getJobs(req, query);
    const docs = jobs.docs.map(job => JobsService.getShareableJobRef(job));
    api(req, res, { ...jobs, docs });
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};

export const getJobById: IRequestHandler<{ id: string }> = async (req, res) => {
  try {
    const { id } = req.params;
    const job = await JobsService.getJobById(req, id);
    api(req, res, JobsService.getShareableJob(job));
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};

export const updateJob: IRequestHandler<{ id: string }, {}, Partial<IJob>> = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      instructions,
      description,
      department,
      jobLocation,
    } = req.body;

    const job = await JobsService.update(req, id, title, instructions, description, department, jobLocation);
    api(req, res, JobsService.getShareableJob(job));
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};
