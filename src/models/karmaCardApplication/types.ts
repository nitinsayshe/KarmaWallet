import { ObjectId, Document } from 'mongoose';
import { IMarqetaKycResult } from '../../integrations/marqeta/user/types';
import { IRef, IModel } from '../../types/model';
import { IShareableVisitor } from '../visitor/types';

export enum ApplicationStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  DECLINED = 'declined',
  CLOSED_DECLINED = 'closed_declined'
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
  expirationDate?: Date;
  lastModified: Date;
}

export interface IKarmaCardApplication extends IShareableCardApplication {}
export interface IKarmaCardApplicationDocument extends IKarmaCardApplication, Document {}
export type IKarmaCardApplicationModel = IModel<IKarmaCardApplication>;
