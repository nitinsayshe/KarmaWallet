import {
  Schema,
  model,
  PaginateModel,
  Document,
} from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { IModel } from '../types/model';

export interface IJobPosting {
  title: string;
  instructions: string;
  description: string;
  department: string;
  jobLocation: string;
  createdAt: Date;
  lastModified: Date;
}

export interface IJobPostingDocument extends IJobPosting, Document {}
export type IJobPostingModel = IModel<IJobPosting>;

const jobPostingSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  instructions: {
    type: String,
  },
  description: {
    type: String,
    required: true,
  },
  department: {
    type: String,
  },
  jobLocation: { // could not use `location` as it is a reserved keyword
    type: String,
  },
  createdAt: {
    type: Date,
  },
  lastModified: {
    type: String,
  },
});
jobPostingSchema.plugin(mongoosePaginate);

export const JobPostingModel = model<IJobPostingDocument, PaginateModel<IJobPosting>>('job_posting', jobPostingSchema);
