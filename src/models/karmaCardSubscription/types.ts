import { ObjectId, Document } from 'mongoose';

export enum KarmaCardSubscriptionName {
  BASIC = 'BASIC',
  PREMIUM = 'PREMIUM',
  ENTERPRISE = 'ENTERPRISE',
}

export interface IShareableKarmaCardSubscription {
  _id?: ObjectId;
  amount: number;
  createdOn: Date;
  lastModified: Date;
  name: KarmaCardSubscriptionName;
}

export interface IKarmaCardSubscription extends IShareableKarmaCardSubscription {}

export interface IKarmaCardSubscriptionDocument extends IKarmaCardSubscription, Document {
  _id: ObjectId;
}
