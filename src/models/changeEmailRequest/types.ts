import {
  Document,
  ObjectId,
} from 'mongoose';
import { IModel, IRef } from '../../types/model';
import { IShareableUser } from '../user/types';
import { IToken } from '../token';

export enum IChangeEmailProcessStatus {
  INCOMPLETE = 'incomplete',
  COMPLETE = 'complete',
  CANCELED = 'canceled',
}

export enum IChangeEmailVerificationStatus {
  UNVERIFIED = 'unverified',
  VERIFIED = 'verified',
}

export interface IChangeEmailRequest {
  _id: ObjectId;
  createdOn: Date;
  user: IRef<ObjectId, IShareableUser>;
  status: IChangeEmailProcessStatus;
  verified: IChangeEmailVerificationStatus;
  currentEmail: string;
  proposedEmail: string;
  verificationToken: IToken;
  affirmationToken: IToken;
}

export interface IChangeEmailRequestDocument extends IChangeEmailRequest, Document {
  _id: ObjectId;
}

export type IChangeEmailRequestModel = IModel<IChangeEmailRequest>;
