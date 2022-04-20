import {
  Schema,
  model,
  Document,
  Model,
} from 'mongoose';
import { IModel } from '../types/model';

export interface ITotalOffsetsForAllUsers {
  dollars: number;
  tons: number;
}

export interface ITransactionsMonitor {
  totalTransactions: number;
  missingCarbonMultiplier: number;
  missingCompany: number;
}

export interface IReport {
  totalOffsetsForAllUsers?: ITotalOffsetsForAllUsers;
  transactionsMonitor?: ITransactionsMonitor;
  createdOn: Date;
}

export interface IReportDocument extends IReport, Document {}
export type IReportModel = IModel<IReport>;

const totalOffsetsForAllUsers = {
  type: {
    dollars: Number,
    tons: Number,
  },
};

const transactionsMonitor = {
  type: {
    totalTransactions: Number,
    missingCarbonMultiplier: Number,
    missingCompany: Number,
  },
};

const reportSchema = new Schema({
  totalOffsetsForAllUsers,
  transactionsMonitor,
  createdOn: Date,
});

export const ReportModel = model<IReportDocument, Model<IReport>>('report', reportSchema);
