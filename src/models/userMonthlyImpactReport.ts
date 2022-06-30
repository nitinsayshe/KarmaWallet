import {
  Schema,
  model,
  Document,
  Model,
  ObjectId,
} from 'mongoose';
import { IEquivalencyObject } from '../services/impact/utils/carbon';
import { IModel, IRef } from '../types/model';
import { ITransactionDocument, transactionSchemaDefinition } from './transaction';
import { IUserDocument } from './user';
import { IUserImpactMonthData, userImpactMonthlyBreakdownDefinition } from './userImpactTotals';

export interface IUserMonthlyCarbonOffsets {
  donationsCount: number;
  totalDonated: number;
  totalOffset: number;
}

export interface IUserMonthlyCarbonReport {
  offsets: IUserMonthlyCarbonOffsets;
  monthlyEmissions: number;
  netEmissions: number;
  totalEmissions: number;
}

export interface IUserMonthlyImpactReportBase {
  user: IRef<ObjectId, IUserDocument>;
  transactions: ITransactionDocument[];
  impact: IUserImpactMonthData;
  date: Date;
  createOn: Date;
}

export interface IUserMonthlyImpactReport extends IUserMonthlyImpactReportBase {
  carbon: IUserMonthlyCarbonReport;
}

export interface IUserMonthlyImpactReportWithEquivalencies extends IUserMonthlyImpactReportBase {
  carbon: IUserMonthlyCarbonReport & { equivalencies: IEquivalencyObject[] };
}

export interface IUserMonthlyImpactReportDocument extends IUserMonthlyImpactReport, Document {}
export interface IUserMonthlyImpactReportWithEquivalenciesDocument extends IUserMonthlyImpactReportWithEquivalencies, Document {}
export type IUserMonthlyImpactReportModel = IModel<IUserMonthlyImpactReport>;

const userCarbonAndEmissionsDefinition = {
  offsets: {
    type: {
      donationsCount: { type: Number },
      totalDonated: { type: Number },
      totalOffset: { type: Number },
    },
  },
  monthlyEmissions: { type: Number },
  netEmissions: { type: Number },
  totalEmissions: { type: Number },
};

const userMonthlyImpactReportSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'user',
  },
  transactions: {
    type: [transactionSchemaDefinition],
  },
  impact: {
    type: userImpactMonthlyBreakdownDefinition,
  },
  carbon: {
    type: userCarbonAndEmissionsDefinition,
  },
  // the date (month) this report is for
  date: { type: Date },
  // the date this statement was generated
  // will usually be the 1st day of the month
  // after `date`
  createdOn: { type: Date },
});

export const UserMontlyImpactReportModel = model<IUserMonthlyImpactReportDocument, Model<IUserMonthlyImpactReport>>('user_monthly_impact_report', userMonthlyImpactReportSchema);
