import aqp from 'api-query-params';
import * as JobPostingsService from '../services/jobPostings';
import { api, error } from '../services/output';
import { asCustomError } from '../lib/customError';
import { IRequestHandler } from '../types/request';
import { IJobPosting } from '../models/jobPosting';

export const createJobPosting: IRequestHandler<{}, {}, Partial<IJobPosting>> = async (req, res) => {
  try {
    const {
      title,
      instructions,
      description,
      department,
      jobLocation,
    } = req.body;
    const job = await JobPostingsService.createJobPosting(req, title, instructions, description, department, jobLocation);
    api(req, res, JobPostingsService.getShareableJobPosting(job));
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};

export const getJobPostings: IRequestHandler = async (req, res) => {
  try {
    const query = aqp(req.query, { skipKey: 'page' });
    const jobs = await JobPostingsService.getJobPostings(req, query);
    const docs = jobs.docs.map(job => JobPostingsService.getShareableJobPostingRef(job));
    api(req, res, { ...jobs, docs });
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};

export const getJobPostingById: IRequestHandler<{ id: string }> = async (req, res) => {
  try {
    const { id } = req.params;
    const job = await JobPostingsService.getJobPostingById(req, id);
    api(req, res, JobPostingsService.getShareableJobPosting(job));
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};

export const updateJobPosting: IRequestHandler<{ id: string }, {}, Partial<IJobPosting>> = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      instructions,
      description,
      department,
      jobLocation,
    } = req.body;

    const job = await JobPostingsService.updateJobPosting(req, id, title, instructions, description, department, jobLocation);
    api(req, res, JobPostingsService.getShareableJobPosting(job));
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};
