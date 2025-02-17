import { Schema, model, Document, PaginateModel, ObjectId } from 'mongoose';
import { getUtcDate } from '../lib/date';

export enum KarmaCommissionPayoutOverviewStatus {
  AwaitingVerification = 'awaiting-verification',
  Denied = 'denied',
  Processing = 'processing',
  Sent = 'sent',
  Success = 'success',
  Verified = 'verified',
}

export interface ICommissionsBreakdown {
  karma: number;
  wildfire: number;
  kard?: number;
}

export interface IPayoutDestination {
  paypal?: number;
  marqeta?: number;
  unknown?: number;
}

export interface IShareableCommissionPayoutOverview {
  _id: ObjectId;
  createdOn: Date;
  payoutDate: Date;
  amount: number;
  status: KarmaCommissionPayoutOverviewStatus;
  commissionPayouts: ObjectId[];
  breakdown: ICommissionsBreakdown;
  disbursementBreakdown: IPayoutDestination;
}

export interface ICommissionPayoutOverview extends IShareableCommissionPayoutOverview {
  _id: ObjectId;
}

export interface ICommissionPayoutOverviewDocument extends ICommissionPayoutOverview, Document {
  _id: ObjectId;
}

const commissionPayoutOverview = new Schema({
  createdOn: { type: Date, default: () => getUtcDate() },
  payoutDate: { type: Date },
  amount: { type: Number },
  // amountPaid: { type: Number },
  status: { type: String, enum: Object.values(KarmaCommissionPayoutOverviewStatus) },
  breakdown: { type: Object },
  disbursementBreakdown: {
    type: {
      paypal: { type: Number },
      marqeta: { type: Number },
      unknown: { type: Number },
    },
  },
  commissionPayouts: { type: [Schema.Types.ObjectId], ref: 'commissionPayouts' },
  // vendorPayments: { type: [Schema.Types.ObjectId], ref: 'vendorPayments' },
});

export const CommissionPayoutOverviewModel = model<ICommissionPayoutOverviewDocument, PaginateModel<IShareableCommissionPayoutOverview>>('commission_payout_overview', commissionPayoutOverview);
