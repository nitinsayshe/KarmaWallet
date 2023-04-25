import {
  Schema,
  model,
  Document,
  PaginateModel,
  ObjectId,
} from 'mongoose';
import { IRef } from '../types/model';
import { IShareableUser } from './user';

export enum KarmaCommissionPayoutStatus {
  Pending = 'pending',
  Paid = 'paid',
  Failed = 'failed',
}

export enum PayPalPayoutItemStatus {
  Unclaimed = 'UNCLAIMED',
  Success = 'SUCCESS',
  Denied = 'DENIED',
  Returned = 'RETURNED',
  Refunded = 'REFUNDED',
  Failed = 'FAILED',
  Blocked = 'BLOCKED',
  Canceled = 'CANCELED',
  Held = 'HELD',
}

export interface ICommissionPayoutPaypalIntegration {
  status: PayPalPayoutItemStatus;
}

export interface ICommissionPayoutIntegrations {
  paypal?: ICommissionPayoutPaypalIntegration;
}

export interface IShareableCommissionPayout {
  _id: ObjectId;
  user: IRef<ObjectId, IShareableUser>;
  date: Date;
  amount: number;
  status: KarmaCommissionPayoutStatus;
  commissions: ObjectId[];
  integrations?: ICommissionPayoutIntegrations;
}

export interface ICommissionPayout extends IShareableCommissionPayout {
  _id: ObjectId;
}

export interface ICommissionPayoutDocument extends ICommissionPayout, Document {
  _id: ObjectId;
}

const commissionPayout = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'user',
  },
  date: { type: Date },
  amount: { type: Number },
  status: { type: String, enum: Object.values(KarmaCommissionPayoutStatus) },
  integrations: { type: Object },
  commissions: { type: [Schema.Types.ObjectId], ref: 'commission' },
});

export const CommissionPayoutModel = model<ICommissionPayoutDocument, PaginateModel<ICommissionPayout>>('commission_payout', commissionPayout);
