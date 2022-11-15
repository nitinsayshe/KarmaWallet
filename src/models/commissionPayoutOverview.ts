import {
  Schema,
  model,
  Document,
  PaginateModel,
  ObjectId,
} from 'mongoose';

export enum KarmaCommissionPayoutOverviewStatus {
  Pending = 'pending',
  Sent = 'sent',
}

export interface IShareableCommissionPayoutOverview {
  _id: ObjectId;
  date: Date;
  amount: number;
  status: KarmaCommissionPayoutOverviewStatus;
  commissionPayouts: ObjectId[];
}

export interface ICommissionPayoutOverview extends IShareableCommissionPayoutOverview {
  _id: ObjectId;
}

export interface ICommissionPayoutOverviewDocument extends ICommissionPayoutOverview, Document {
  _id: ObjectId;
}

const commissionPayoutOverview = new Schema({
  date: { type: Date },
  amount: { type: Number },
  status: { type: String, enum: Object.values(KarmaCommissionPayoutOverviewStatus) },
  commissionPayouts: { type: [Schema.Types.ObjectId], ref: 'commissionPayouts' },
});

export const CommissionPayoutOverviewModel = model<ICommissionPayoutOverviewDocument, PaginateModel<IShareableCommissionPayoutOverview>>('commissionPayoutOverview', commissionPayoutOverview);
