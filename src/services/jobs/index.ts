import { FilterQuery } from 'mongoose';
import { ErrorTypes } from '../../lib/constants';
import CustomError, { asCustomError } from '../../lib/customError';
import { toUTC } from '../../lib/date';
import {
  IJob, IJobModel, JobModel,
} from '../../models/job';
import { IRequest } from '../../types/request';

export const createJob = (_: IRequest, title: string, instructions: string, description: string, department: string, location: string) => {
  if (!title) throw new CustomError('A job title is required.', ErrorTypes.INVALID_ARG);
  if (!description) throw new CustomError('A job description is required.', ErrorTypes.INVALID_ARG);
  if (!department) throw new CustomError('A job department is required.', ErrorTypes.INVALID_ARG);
  if (!location) throw new CustomError('A job location is required.', ErrorTypes.INVALID_ARG);

  try {
    const timestamp = toUTC(new Date());

    const job = new JobModel({
      title,
      instructions,
      description,
      department,
      jobLocation: location,
      createdAt: timestamp,
      lastModified: timestamp,
    });

    return job.save();
  } catch (err) {
    throw asCustomError(err);
  }
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

export const update = (_: IRequest, id: string, title: string, instructions: string, description: string, department: string, jobLocation: string) => {
  if (!title && !description && !department && !jobLocation) throw new CustomError('No updatable data found for job posting.', ErrorTypes.INVALID_ARG);

  const updates: Partial<IJob> = {
    lastModified: toUTC(new Date()),
  };

  if (title) updates.title = title;
  if (instructions) updates.instructions = instructions;
  if (description) updates.description = description;
  if (department) updates.department = department;
  if (jobLocation) updates.jobLocation = jobLocation;

  return JobModel.findByIdAndUpdate(id, updates, { new: true });
};

export const getSharableJobRef = (job: IJobModel) => ({
  _id: job._id,
  title: job.title,
  department: job.department,
  location: job.jobLocation,
  createdAt: job.createdAt,
  lastModified: job.lastModified,
});

export const getSharableJob = (job: IJobModel) => {
  const ref = getSharableJobRef(job);

  return {
    ...ref,
    instructions: job.instructions,
    description: job.description,
  };
};
