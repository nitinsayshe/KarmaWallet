import {
  Schema,
  model,
  PaginateModel,
  Document,
  ObjectId,
} from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { IModel, IRef } from '../types/model';
import { IUserDocument } from './user';

export enum JobReportStatus {
  Initializing = 'initializing',
  Pending = 'pending',
  Validating = 'validating',
  Processing = 'processing',
  Completed = 'completed',
  CompletedWithErrors = 'completed-with-errors',
  Failed = 'failed',
  Unknown = 'unknown',
}

export interface IJobReportData {
  status: JobReportStatus;
  message: string;
  createdAt: Date;
  lastModified?: Date;
}

export interface IJobReport {
  name: string;
  initiatedBy: IRef<ObjectId, IUserDocument>;
  status: JobReportStatus;
  data: IJobReportData[];
  createdAt: Date;
  lastModified?: Date;
}

export interface IJobReportDocument extends IJobReport, Document {}
export type IJobReportModel = IModel<IJobReport>;

const jobReportSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  initiatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'user',
  },
  status: {
    type: String,
    required: true,
    enum: Object.values(JobReportStatus),
  },
  data: {
    type: [{
      status: {
        type: String,
        required: true,
        enum: Object.values(JobReportStatus),
      },
      message: {
        type: String,
        required: true,
      },
      createdAt: {
        type: Date,
        required: true,
      },
      lastModified: {
        type: Date,
      },
    }],
    default: [],
  },
  createdAt: {
    type: Date,
    required: true,
  },
  lastModified: {
    type: String,
  },
});
jobReportSchema.plugin(mongoosePaginate);

export const JobReportModel = model<IJobReportDocument, PaginateModel<IJobReport>>('job_report', jobReportSchema);
