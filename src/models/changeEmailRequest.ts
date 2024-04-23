import {
  Schema,
  model,
  Document,
  Model,
  ObjectId,
} from 'mongoose';
import { IModel, IRef } from '../types/model';
import { IShareableUser } from './user/types';
import { getUtcDate } from '../lib/date';
import { IToken } from './token';

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

const changeEmailRequest = new Schema({
  createdOn: { type: Date, default: () => getUtcDate().toDate() },
  user: { type: Schema.Types.ObjectId, ref: 'user' },
  status: { type: String, enum: Object.values(IChangeEmailProcessStatus), default: IChangeEmailProcessStatus.INCOMPLETE },
  verified: { type: String, enum: Object.values(IChangeEmailVerificationStatus), default: IChangeEmailVerificationStatus.UNVERIFIED },
  currentEmail: { type: String },
  proposedEmail: { type: String, default: null },
  verificationToken: { type: Schema.Types.ObjectId, ref: 'token' },
  affirmationToken: { type: Schema.Types.ObjectId, ref: 'token', default: null },
});

export const ChangeEmailRequestModel = model<IChangeEmailRequestDocument, Model<IChangeEmailRequest>>('change_email_request', changeEmailRequest);
