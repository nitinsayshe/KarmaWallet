import { ObjectId, Document } from 'mongoose';
import { IShareableSubscription } from '../subscription/types';
import { IRef } from '../../types/model';
import { IShareableUser } from '../user/types';

export enum UserSubscriptionStatus {
  paid = 'paid',
  unpaid = 'unpaid',
  cancelled = 'cancelled',
}

export interface IUserSubscriptionIntegrations {
  stripe?: {
    productId: string;
  }
}

export interface IShareableUserSubscription {
  _id?: ObjectId;
  createdOn: Date;
  expirationDate: Date;
  integrations?: IUserSubscriptionIntegrations;
  lastBilledDate: Date;
  lastModified: Date;
  status: UserSubscriptionStatus;
  subscription: IRef<ObjectId, IShareableSubscription>;
  userId: IRef<ObjectId, IShareableUser>;
}

export interface IUserSubscription extends IShareableUserSubscription {}

export interface IUserSubscriptionDocument extends IUserSubscription, Document {
  _id: ObjectId;
}
