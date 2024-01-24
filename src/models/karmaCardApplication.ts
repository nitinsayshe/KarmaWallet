import { Schema, model, Document, Model, ObjectId } from 'mongoose';
import { getUtcDate } from '../lib/date';
import { IModel, IRef } from '../types/model';
import { IMarqetaKycResult } from './user';
import { IShareableVisitor } from './visitor';

export enum ApplicationStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  DECLINED = 'declined'
}

export interface IShareableCardApplication {
  userId?: string;
  visitorId?: IRef<ObjectId, IShareableVisitor>;
  userToken: string;
  firstName: string;
  lastName: string;
  email: string;
  address1: string;
  address2: string;
  birthDate: string;
  phone: string;
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
  userId: { type: String },
  visitorId: {
    type: Schema.Types.ObjectId,
    ref: 'visitor',
  },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  address1: { type: String, required: true },
  address2: { type: String },
  birthDate: { type: String, required: true },
  phone: { type: String, required: true },
  city: { type: String, required: true },
  postalCode: { type: String, required: true },
  state: { type: String, required: true },
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
