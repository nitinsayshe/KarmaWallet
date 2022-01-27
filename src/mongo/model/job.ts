import {
  Schema,
  model,
  PaginateModel,
  Types,
} from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { IModel } from '../../types/model';
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
export type IJobModel = IModel<IJob>;

const jobSchema = new Schema(schemaDefinition);
jobSchema.plugin(mongoosePaginate);

export const JobModel = model<IJobDocument, PaginateModel<IJob>>('job', jobSchema);
