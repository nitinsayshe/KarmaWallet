import {
  Schema,
  model,
  Document,
  Model,
} from 'mongoose';
import { IModel } from '../types/model';

export interface ITransactionsMonitor {
  totalTransactions: number;
  missingCarbonMultiplier: number;
  missingCompany: number;
}

export interface IReport {
  transactionsMonitor?: ITransactionsMonitor;
  createdOn: Date;
}

export interface IReportDocument extends IReport, Document {}
export type IReportModel = IModel<IReport>;

const transactionsMonitor = {
  type: {
    totalTransactions: Number,
    missingCarbonMultiplier: Number,
    missingCompany: Number,
  },
};

const reportSchema = new Schema({
  transactionsMonitor,
  createdOn: Date,
});

export const ReportModel = model<IReportDocument, Model<IReport>>('report', reportSchema);
