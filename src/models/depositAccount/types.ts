import { ObjectId, Document } from 'mongoose';
import { IShareableUser } from '../user/types';
import { IRef } from '../../types/model';
import { IMarqetaDepositAccountTransitionState } from '../../integrations/marqeta/types';

export interface IMarqetaIntegration {
  allow_immediate_credit: boolean;
  created_time: Date;
  last_modified_time: Date;
  state: IMarqetaDepositAccountTransitionState;
  token: string;
  type: string;
  user_token: string;
  routing_number: string;
  account_number: string;
}

export interface IShareableDepositAccount {
  _id?: ObjectId;
  userId?: IRef<ObjectId, IShareableUser>;
  createdOn: Date;
  lastModified: Date;
  state: IMarqetaDepositAccountTransitionState;
  routingNumber: string;
  accountNumber: string;
  integrations?: {
    marqeta?: IMarqetaIntegration;
  }
}

export interface IDepositAccount extends IShareableDepositAccount {}

export interface IDepositAccountDocument extends IDepositAccount, Document {
  _id: ObjectId;
}
