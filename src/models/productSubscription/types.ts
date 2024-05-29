import { ObjectId, Document } from 'mongoose';
import Stripe from 'stripe';

export enum ProductSubscriptionName {
  BASIC = 'Standard Karma Wallet Membership',
  PREMIUM = 'Premium Karma Wallet Membership',
}

export enum ProductSubscriptionType {
  KARMAWALLET = 'KarmaWallet',
}

export interface IStripeProductSubscriptionIntegration {
  productId: string;
}

export enum ProductSubscriptionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export interface IProductSubscriptionIntegrations {
  stripe?: Stripe.Product;
}

export interface IShareableProductSubscription {
  _id?: ObjectId;
  amount: string;
  createdOn: Date;
  lastModified: Date;
  name: string;
  type: ProductSubscriptionType;
  integrations?: IProductSubscriptionIntegrations;
  status: ProductSubscriptionStatus;
  link?: string;
}

export interface IProductSubscription extends IShareableProductSubscription {}

export interface IProductSubscriptionDocument extends IProductSubscription, Document {
  _id: ObjectId;
}
