import {
  Schema,
  model,
  Document,
  Model,
} from 'mongoose';
import { JobStatus } from '../../lib/constants';
import { IModel } from '../../types/model';
import schemaDefinition from '../schema/jobStatus';

export interface IJobStatus {
  name: string;
  status: JobStatus;
  lastModified: Date;
}

export interface IJobStatusDocument extends IJobStatus, Document {}
export type IJobStatusModel = IModel<IJobStatus>;

export const JobStatusModel = model<IJobStatusDocument, Model<IJobStatus>>('job_status', new Schema(schemaDefinition));
