import { ObjectId, Document } from 'mongoose';
import { IShareableProductSubscription } from '../productSubscription/types';
import { IRef } from '../../types/model';
import { IShareableUser } from '../user/types';

export enum UserProductSubscriptionStatus {
  paid = 'paid',
  unpaid = 'unpaid',
  cancelled = 'cancelled',
}

export interface IUserProductSubscriptionIntegrations {
  stripe?: {
    productId: string;
  }
}

export interface IShareableUserProductSubscription {
  _id?: ObjectId;
  createdOn: Date;
  expirationDate: Date;
  integrations?: IUserProductSubscriptionIntegrations;
  lastBilledDate: Date;
  lastModified: Date;
  status: UserProductSubscriptionStatus;
  subscription: IRef<ObjectId, IShareableProductSubscription>;
  userId: IRef<ObjectId, IShareableUser>;
}

export interface IUserProductSubscription extends IShareableUserProductSubscription {}

export interface IUserProductSubscriptionDocument extends IUserProductSubscription, Document {
  _id: ObjectId;
}
