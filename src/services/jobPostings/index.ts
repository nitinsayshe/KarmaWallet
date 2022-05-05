import { FilterQuery } from 'mongoose';
import { ErrorTypes } from '../../lib/constants';
import CustomError, { asCustomError } from '../../lib/customError';
import { toUTC } from '../../lib/date';
import {
  IJobPosting, IJobPostingModel, JobPostingModel,
} from '../../models/jobPosting';
import { IRequest } from '../../types/request';

export interface IJopPostingRequestParams {
  jobPostingId: string;
}

export interface IJobPostingRequestBody {
  title: string;
  instructions: string;
  description: string;
  department: string;
  jobLocation: string;
  applicationUrl: string;
}

export const createJobPosting = (req: IRequest<{}, {}, IJobPostingRequestBody>) => {
  const { title, instructions, description, department, jobLocation, applicationUrl } = req.body;

  if (!title) throw new CustomError('A job title is required.', ErrorTypes.INVALID_ARG);
  if (!description) throw new CustomError('A job description is required.', ErrorTypes.INVALID_ARG);
  if (!department) throw new CustomError('A job department is required.', ErrorTypes.INVALID_ARG);
  if (!jobLocation) throw new CustomError('A job location is required.', ErrorTypes.INVALID_ARG);
  if (!applicationUrl) throw new CustomError('An application url is required.', ErrorTypes.INVALID_ARG);

  try {
    const timestamp = toUTC(new Date());

    const jobPosting = new JobPostingModel({
      title,
      instructions,
      description,
      department,
      applicationUrl,
      jobLocation,
      createdAt: timestamp,
      lastModified: timestamp,
    });

    return jobPosting.save();
  } catch (err) {
    throw asCustomError(err);
  }
};

export const getJobPostings = (_: IRequest, query: FilterQuery<IJobPosting> = {}) => {
  const options = {
    projection: query?.projection || '',
    lean: !!query.lean,
    page: query?.skip || 1,
    sort: query?.sort ? { ...query.sort } : { lastModified: -1 },
    limit: query?.limit || 10,
  };

  return JobPostingModel.paginate(query.filter, options);
};

export const getJobPostingById = async (req: IRequest<IJopPostingRequestParams>) => JobPostingModel.findById(req.params.jobPostingId);

export const updateJobPosting = (req: IRequest<IJopPostingRequestParams, {}, IJobPostingRequestBody>) => {
  const { title, instructions, description, department, jobLocation, applicationUrl } = req.body;

  if (!title && !description && !department && !jobLocation && !applicationUrl) throw new CustomError('No updatable data found for job posting.', ErrorTypes.INVALID_ARG);

  const updates: Partial<IJobPosting> = {
    lastModified: toUTC(new Date()),
  };

  if (title) updates.title = title;
  if (instructions) updates.instructions = instructions;
  if (description) updates.description = description;
  if (department) updates.department = department;
  if (jobLocation) updates.jobLocation = jobLocation;
  if (applicationUrl) updates.applicationUrl = applicationUrl;

  return JobPostingModel.findByIdAndUpdate(req.params.jobPostingId, updates, { new: true });
};

export const getShareableJobPostingRef = (job: IJobPostingModel) => ({
  _id: job._id,
  title: job.title,
  department: job.department,
  jobLocation: job.jobLocation,
  applicationUrl: job.applicationUrl,
  createdAt: job.createdAt,
  lastModified: job.lastModified,
});

export const getShareableJobPosting = (job: IJobPostingModel) => {
  const ref = getShareableJobPostingRef(job);

  return {
    ...ref,
    instructions: job.instructions,
    description: job.description,
  };
};
