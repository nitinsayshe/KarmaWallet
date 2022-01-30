import {
  Schema,
  model,
  Document,
  Model,
} from 'mongoose';
import { JobStatus } from '../lib/constants';
import { IModel } from '../types/model';

export interface IJobStatus {
  name: string;
  status: JobStatus;
  lastModified: Date;
}

export interface IJobStatusDocument extends IJobStatus, Document {}
export type IJobStatusModel = IModel<IJobStatus>;

const jobStatusSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: Object.values(JobStatus),
    default: JobStatus.Inactive,
  },
  lastModified: { type: Date },
});

export const JobStatusModel = model<IJobStatusDocument, Model<IJobStatus>>('job_status', jobStatusSchema);
