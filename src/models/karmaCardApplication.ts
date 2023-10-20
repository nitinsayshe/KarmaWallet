import { Schema, model, Document, Model, ObjectId } from 'mongoose';
import { getUtcDate } from '../lib/date';
import { IModel, IRef } from '../types/model';
import { IMarqetaKycResult, IShareableUser } from './user';

export enum ApplicationStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  DECLINED = 'declined'
}

export interface IShareableCardApplication {
  userId?: IRef<ObjectId, IShareableUser>;
  visitorId: IRef<ObjectId, IShareableUser>;
  userToken: string;
  firstName: string;
  lastName: string;
  email: string;
  address1: string;
  address2: string;
  birthDate: string;
  city: string;
  postalCode: string;
  state: string;
  kycResult: IMarqetaKycResult;
  status: ApplicationStatus;
  lastModified: Date;
}

export interface IKarmaCardApplication extends IShareableCardApplication {
}

export interface IKarmaCardApplicationDocument extends IKarmaCardApplication, Document { }
export type IKarmaCardApplicationModel = IModel<IKarmaCardApplication>;

const karmaCardApplication = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'user',
  },
  visitorId: {
    type: Schema.Types.ObjectId,
    ref: 'visitor',
    required: true,
  },
  firstName: { type: String },
  lastName: { type: String },
  email: { type: String },
  address1: { type: String },
  address2: { type: String },
  birthDate: { type: String },
  city: { type: String },
  postalCode: { type: String },
  state: { type: String },
  userToken: { type: String },
  kycResult: {
    status: { type: String },
    codes: { type: Array },
  },
  status: { type: String },
  createdOn: { type: Date, default: () => getUtcDate() },
  lastModified: { type: Date, default: () => getUtcDate().toDate() },
});

export const KarmaCardApplicationModel = model<IKarmaCardApplicationDocument, Model<IKarmaCardApplicationModel>>('karmaCardApplication', karmaCardApplication);
