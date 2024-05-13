import { ObjectId, Document } from 'mongoose';

export enum KarmaCardUserSubscriptionStatus {
  paid = 'paid',
  unpaid = 'unpaid',
  cancelled = 'cancelled',
}

export interface IKarmaCardUserSubscriptionIntegrations {
  stripe?: {
    productId: string;
  }
}

export interface IShareableKarmaCardUserSubscription {
  _id?: ObjectId;
  karmaCardSubscriptionId: ObjectId;
  userId: ObjectId;
  createdOn: Date;
  lastModified: Date;
  expirationDate: Date;
  lastBilledDate: Date;
  status: KarmaCardUserSubscriptionStatus;
  integrations?: IKarmaCardUserSubscriptionIntegrations;
}

export interface IKarmaCardUserSubscription extends IShareableKarmaCardUserSubscription {}

export interface IKarmaCardUserSubscriptionDocument extends IKarmaCardUserSubscription, Document {
  _id: ObjectId;
}
