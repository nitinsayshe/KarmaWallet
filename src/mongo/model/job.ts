import {
  Schema,
  model,
  PaginateModel,
  Types,
} from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
// import { IPaginationPlugin } from '../../types/mongo';
import schemaDefinition from '../schema/job';

export interface IJob {
  title: string;
  instructions: string;
  description: string;
  department: string;
  jobLocation: string;
  createdAt: Date;
  lastModified: string;
}

export interface IJobDocument extends IJob, Document {
  _id: Types.ObjectId;
  lastModified: string;
}

export interface IJobModel extends PaginateModel<IJob> {}

const jobSchema = new Schema(schemaDefinition);
jobSchema.plugin(mongoosePaginate);

export const JobModel = model<IJobDocument, IJobModel>('job', jobSchema);
