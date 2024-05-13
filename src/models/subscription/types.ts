import { ObjectId, Document } from 'mongoose';

export enum SubscriptionName {
  BASIC = 'BASIC',
  PREMIUM = 'PREMIUM',
  ENTERPRISE = 'ENTERPRISE',
}

export interface IShareableSubscription {
  _id?: ObjectId;
  amount: number;
  createdOn: Date;
  lastModified: Date;
  name: SubscriptionName;
}

export interface ISubscription extends IShareableSubscription {}

export interface ISubscriptionDocument extends ISubscription, Document {
  _id: ObjectId;
}
