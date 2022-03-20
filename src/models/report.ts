import {
  Schema,
  model,
  Document,
  Model,
} from 'mongoose';
import { IModel } from '../types/model';

export interface ITransactionAnalysis {
  totalTransactions: number;
  missingCarbonMultiplier: number;
  missingCompany: number;
}

export interface IReport {
  transactionAnalysis?: ITransactionAnalysis;
}

export interface IReportDocument extends IReport, Document {}
export type IReportModel = IModel<IReport>;

const transactionAnalysis = {
  totalTransactions: Number,
  missingCarbonMultiplier: Number,
  missingCompany: Number,
};

const reportSchema = new Schema({
  transactionAnalysis,
  createdOn: Date,
});

export const ReportModel = model<IReportDocument, Model<IReport>>('report', reportSchema);
