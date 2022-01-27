import { FilterQuery, Document, Types } from 'mongoose';
import { ErrorTypes } from '../../lib/constants';
import CustomError from '../../lib/customError';
import {
  IJob, JobModel,
} from '../../mongo/model/job';
import { IRequest } from '../../types/request';
import * as JobsDb from './db';

/**
 * @typedef {Object} JobPosting
 * @property {string} JobPosting.title
 * @property {string} JobPosting.description
 * @property {string} JobPosting.department
 * @property {string} JobPosting.location
 */

export const createJob = (_: IRequest, title: string, instructions: string, description: string, department: string, location: string) => {
  if (!title) throw new CustomError('A job title is required.', ErrorTypes.INVALID_ARG);
  if (!description) throw new CustomError('A job description is required.', ErrorTypes.INVALID_ARG);
  if (!department) throw new CustomError('A job department is required.', ErrorTypes.INVALID_ARG);
  if (!location) throw new CustomError('A job location is required.', ErrorTypes.INVALID_ARG);

  return JobsDb.create(title, instructions, description, department, location);
};

export const getJobs = (_: IRequest, query: FilterQuery<IJob> = {}) => {
  const options = {
    projection: query?.projection || '',
    lean: !!query.lean,
    page: query?.skip || 1,
    sort: query?.sort ? { ...query.sort } : { lastModified: -1 },
    limit: query?.limit || 10,
  };

  return JobModel.paginate(query.filter, options);
};

export const getJobById = async (_: IRequest, id: string) => JobModel.findById(id);

export const update = (_: IRequest, id: string, title: string, instructions: string, description: string, department: string, location: string) => {
  if (!title && !description && !department && location) throw new CustomError('No updatable data found for job posting.', ErrorTypes.INVALID_ARG);
  return JobsDb.findByIdAndUpdate(id, {
    title,
    instructions,
    description,
    department,
    jobLocation: location,
  });
};

export const getSharableJobRef = (job: Document<unknown, any, IJob> & IJob & { _id: Types.ObjectId; }) => ({
  _id: job._id,
  title: job.title,
  department: job.department,
  location: job.jobLocation,
  createdAt: job.createdAt,
  lastModified: job.lastModified,
});

export const getSharableJob = (job: Document<unknown, any, IJob> & IJob & { _id: Types.ObjectId; }) => {
  const ref = getSharableJobRef(job);

  return {
    ...ref,
    instructions: job.instructions,
    description: job.description,
  };
};
