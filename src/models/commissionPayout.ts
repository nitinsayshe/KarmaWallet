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
}

export interface IShareableCommissionPayout {
  _id: ObjectId;
  user: IRef<ObjectId, IShareableUser>;
  date: Date;
  amount: number;
  status: KarmaCommissionPayoutStatus;
  commissions: ObjectId[];
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
  commissions: { type: [Schema.Types.ObjectId], ref: 'commission' },
});

export const CommissionPayoutModel = model<ICommissionPayoutDocument, PaginateModel<ICommissionPayout>>('commission_payout', commissionPayout);
