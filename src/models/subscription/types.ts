import { ObjectId, Document } from 'mongoose';

export enum SubscriptionName {
  BASIC = 'BASIC',
  PREMIUM = 'PREMIUM',
  ENTERPRISE = 'ENTERPRISE',
}

export interface IStripeSubscriptionIntegration {
  productId: string;
}

export interface ISubscriptionIntegrations {
  stripe?: IStripeSubscriptionIntegration;
}

export interface IShareableSubscription {
  _id?: ObjectId;
  amount: number;
  createdOn: Date;
  lastModified: Date;
  name: SubscriptionName;
  integrations?: ISubscriptionIntegrations;
}

export interface ISubscription extends IShareableSubscription {}

export interface ISubscriptionDocument extends ISubscription, Document {
  _id: ObjectId;
}
