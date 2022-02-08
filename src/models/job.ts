import {
  Schema,
  model,
  PaginateModel,
  Document,
} from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { IModel } from '../types/model';

export interface IJob {
  title: string;
  instructions: string;
  description: string;
  department: string;
  jobLocation: string;
  createdAt: Date;
  lastModified: Date;
}

export interface IJobDocument extends IJob, Document {}
export type IJobModel = IModel<IJob>;

const jobSchema = new Schema({
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
jobSchema.plugin(mongoosePaginate);

export const JobModel = model<IJobDocument, PaginateModel<IJob>>('job', jobSchema);
