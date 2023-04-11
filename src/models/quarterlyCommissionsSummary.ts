import {
  Schema,
  Model,
  model,
  Document,
  ObjectId,
} from 'mongoose';
import { ICommissionPayout } from './commissionPayout';
import { IModel } from '../types/model';

export enum KarmaCommissionPayoutStatus {
  Pending = 'pending',
  Paid = 'paid',
}

export interface IShareableQuarterlyCommissionsSummary {
  _id: ObjectId;
  date: Date;
  total: number;
  status: KarmaCommissionPayoutStatus;
  commissionPayouts: ICommissionPayout[];
}

export interface IQuarterlyCommissionsSummaryDocument extends IShareableQuarterlyCommissionsSummary, Document {
  _id: ObjectId;
}

export type IQuarterlyCommissionsModel = IModel<IQuarterlyCommissionsSummaryDocument>;

const quarterlyCommissionsSummarySchema = new Schema({
  date: { type: Date },
  total: { type: Number },
  status: { type: String, enum: Object.values(KarmaCommissionPayoutStatus) },
  commissionPayouts: { type: [Schema.Types.ObjectId], ref: 'commission' },
});

export const QuarterlyCommissionsSummary = model<IQuarterlyCommissionsSummaryDocument, Model<IQuarterlyCommissionsSummaryDocument>>('quarterlyCommissionsSummary', quarterlyCommissionsSummarySchema);
