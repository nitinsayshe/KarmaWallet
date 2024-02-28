import { ObjectId } from 'mongoose';
import { IModel, IRef } from '../../types/model';
import { IShareableUser } from '../user/types';

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
