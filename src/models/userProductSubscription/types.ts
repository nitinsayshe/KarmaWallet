import { ObjectId, Document } from 'mongoose';
import Stripe from 'stripe';
import { IShareableProductSubscription } from '../productSubscription/types';
import { IRef } from '../../types/model';
import { IShareableUser } from '../user/types';
import { IShareableInvoice } from '../invoice/types';

// https://docs.stripe.com/api/subscriptions/object#subscription_object-status
export enum UserProductSubscriptionStatus {
  ACTIVE = 'active',
  // payment required but cannot be paid because failed payment, after retried this will transition to unpaid or canceled
  PAST_DUE = 'pastDue',
  CANCELLED = 'canceled',
  // trial ends without a payment
  TRIALING = 'trialing',
  PAUSED = 'paused',
  UNPAID = 'unpaid',
  // a subscription moves into incomplete if the initial payment attempt fails.
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incompleteExpired',
}

export interface IUserProductSubscriptionIntegrations {
  stripe?: Stripe.Subscription;
}

export interface IShareableUserProductSubscription {
  _id?: ObjectId;
  createdOn: Date;
  integrations?: IUserProductSubscriptionIntegrations;
  nextBillingDate: Date;
  lastBilledDate: Date;
  lastModified: Date;
  latestInvoice: IRef<ObjectId, IShareableInvoice>;
  status: UserProductSubscriptionStatus;
  productSubscription: IRef<ObjectId, IShareableProductSubscription>;
  user: IRef<ObjectId, IShareableUser>;
}

export interface IUserProductSubscription extends IShareableUserProductSubscription {}

export interface IUserProductSubscriptionDocument extends IUserProductSubscription, Document {
  _id: ObjectId;
}
