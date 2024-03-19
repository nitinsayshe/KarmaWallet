import {
  Schema,
  model,
  Document,
  Model,
  ObjectId,
} from 'mongoose';
import { IModel, IRef } from '../types/model';
import { IShareableUser } from './user/types';

export enum IDepositAccountState {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  TERMINATED = 'TERMINATED',
  UNACTIVATED = 'UNACTIVATED'
}

export interface IShareableDepositAccount {
  _id?: ObjectId;
  userId?: IRef<ObjectId, IShareableUser>;
  token: string;
  account_number: string;
  allow_immediate_credit: boolean;
  routing_number: string;
  state: IDepositAccountState;
  user_token: string;
  created_time: Date;
  last_modified_time: Date;
}

export interface IDepositAccount extends IShareableDepositAccount {
}

export interface IDepositAccountDocument extends IDepositAccount, Document {
  _id: ObjectId;
}

export type IDepositAccountModel = IModel<IDepositAccount>;

const DepositAccountSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  account_number: { type: String },
  allow_immediate_credit: { type: Boolean },
  user_token: { type: String },
  routing_number: { type: String },
  state: { type: String, enum: Object.values(IDepositAccountState) },
  token: { type: String },
  type: { type: String },
  created_time: { type: Date },
  last_modified_time: { type: Date },
});

export const DepositAccountModel = model<IDepositAccountDocument, Model<IDepositAccount>>('deposit_account', DepositAccountSchema);
