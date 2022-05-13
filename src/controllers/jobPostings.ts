import aqp from 'api-query-params';
import * as JobPostingsService from '../services/jobPostings';
import { api, error } from '../services/output';
import { asCustomError } from '../lib/customError';
import { IRequestHandler } from '../types/request';

export const createJobPosting: IRequestHandler<{}, {}, JobPostingsService.IJobPostingRequestBody> = async (req, res) => {
  try {
    const job = await JobPostingsService.createJobPosting(req);
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

export const getJobPostingById: IRequestHandler<JobPostingsService.IJopPostingRequestParams> = async (req, res) => {
  try {
    const job = await JobPostingsService.getJobPostingById(req);
    api(req, res, JobPostingsService.getShareableJobPosting(job));
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};

export const updateJobPosting: IRequestHandler<JobPostingsService.IJopPostingRequestParams, {}, JobPostingsService.IJobPostingRequestBody> = async (req, res) => {
  try {
    const job = await JobPostingsService.updateJobPosting(req);
    api(req, res, JobPostingsService.getShareableJobPosting(job));
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};
