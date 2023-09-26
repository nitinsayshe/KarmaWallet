import {
  Schema,
  model,
  Document,
  Model,
  ObjectId,
} from 'mongoose';
import { IModel } from '../types/model';

export enum IACHTransferStatuses {
  INITIATED = 'INITIATED',
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUBMITTED = 'SUBMITTED',
  RETURNED = 'RETURNED',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
  CANCELLED = 'CANCELLED'
}

export enum IACHTransferTypes {
  PUSH = 'PUSH',
  PULL = 'PULL'
}

export interface IACHTransition {
  token: String;
  bank_transfer_token: String;
  status: IACHTransferStatuses;
  transaction_token: String;
  created_time: Date;
  last_modified_time: Date;
}

export interface IACHTransfer {
  _id: ObjectId;
  token: String;
  amount: Number;
  channel: String;
  funding_source_token: String;
  type: IACHTransferTypes;
  currency_code: String;
  transfer_speed:String;
  status: IACHTransferStatuses;
  transitions: IACHTransition;
  created_time: Date;
  last_modified_time: Date;
}

export interface IACHTransferDocument extends IACHTransfer, Document {
  _id: ObjectId;
}

export type IACHTransferModel = IModel<IACHTransfer>;

const ACHTransferSchema = new Schema({
  token: { type: String },
  amount: { type: Number },
  channel: { type: String },
  funding_source_token: { type: String },
  type: { type: String, enum: Object.values(IACHTransferTypes) },
  currency_code: { type: String },
  transfer_speed: { type: String },
  status: { type: String, enum: Object.values(IACHTransferStatuses) },
  transitions: [
    {
      token: { type: String },
      bank_transfer_token: { type: String },
      status: { type: String, enum: Object.values(IACHTransferStatuses) },
      transaction_token: { type: String },
      created_time: { type: Date },
      last_modified_time: { type: Date },
    },
  ],
  created_time: { type: Date },
  last_modified_time: { type: Date },
});

export const ACHTransferModel = model<IACHTransferDocument, Model<IACHTransfer>>('ach_transfer', ACHTransferSchema);
