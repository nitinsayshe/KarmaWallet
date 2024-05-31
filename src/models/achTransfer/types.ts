import { ObjectId } from 'mongoose';
import { IModel } from '../../types/model';

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

export interface IACHBankTransfer {
  token: string;
  amount: number;
  channel: string;
  funding_source_token: string;
  type: string;
  bank?: IBank;
  currency_code: string;
  transfer_speed: string;
  status: string;
  transitions: IACHTransition;
  created_time: Date;
  last_modified_time: Date;
}

export interface IExternalMappedShareableACHTransfer {
  _id: ObjectId;
  userId: ObjectId;
  token: string;
  status: IACHTransferStatuses;
  amount: number;
  createdOn: Date;
  accountMask: string;
  accountType: string;
  bank?: IBank;
}

export interface IShareableACHTransfer {
  _id: ObjectId;
  userId: ObjectId;
  // use this as the bank_transfer_token when making updates
  token: string;
  amount: number;
  channel: string;
  // token for the ACH funding source (in the ach_funding_sources collection)
  funding_source_token: string;
  type: IACHTransferTypes;
  currency_code: string;
  transfer_speed: string;
  bank?: IBank;
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
