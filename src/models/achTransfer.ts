import {
  Schema,
  model,
  Document,
  Model,
  ObjectId,
} from 'mongoose';
import { IModel, IRef } from '../types/model';
import { IShareableUser } from './user';

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

export interface IBank {
  name: string;
  subtype: string;
  institution: string;
  mask: string;
  type: string;
}

export interface IACHTransition {
  token: string;
  bank_transfer_token: string;
  status: IACHTransferStatuses;
  transaction_token: string;
  created_time: Date;
  last_modified_time: Date;
}

export interface IShareableACHTransfer {
  _id: ObjectId;
  userId: IRef<ObjectId, IShareableUser>;
  // use this as the bank_transfer_token when making updates
  token: string;
  amount: number;
  channel: string;
  // token for the ACH funding source (in the ach_funding_sources collection)
  funding_source_token: string;
  type: IACHTransferTypes;
  currency_code: string;
  transfer_speed: string;
  bank: IBank;
  status: IACHTransferStatuses;
  transitions: IACHTransition;
  created_time: Date;
  last_modified_time: Date;
}

export interface IACHTransfer extends IShareableACHTransfer {
  _id: ObjectId;
}

export interface IACHTransferDocument extends IACHTransfer, Document {
  _id: ObjectId;
}

export interface IACHTrasferDocumentWithSourceData extends IACHTransferDocument {
  accountMask: string;
  accountType: string;
}

export type IACHTransferModel = IModel<IACHTransfer>;

const ACHTransferSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  token: { type: String },
  amount: { type: Number },
  channel: { type: String },
  funding_source_token: { type: String },
  type: { type: String, enum: Object.values(IACHTransferTypes) },
  currency_code: { type: String },
  transfer_speed: { type: String },
  status: { type: String, enum: Object.values(IACHTransferStatuses) },
  bank: {
    name: { type: String },
    subtype: { type: String },
    type: { type: String },
    institution: { type: String },
    mask: { type: String },
  },
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
