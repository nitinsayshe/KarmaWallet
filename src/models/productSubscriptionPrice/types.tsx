import { ObjectId, Document } from 'mongoose';
import Stripe from 'stripe';

export interface IProductSubscriptionPriceIntegrations {
  stripe?: Stripe.Price;
}

export interface IShareableProductSubscriptionPrice {
  _id?: ObjectId;
  amount: string;
  createdOn: Date;
  lastModified: Date;
  active: boolean;
  productSubscription: ObjectId;
  integrations?: IProductSubscriptionPriceIntegrations;
}

export interface IProductSubscriptionPrice extends IShareableProductSubscriptionPrice {}

export interface IProductSubscriptionPriceDocument extends IProductSubscriptionPrice, Document {
  _id: ObjectId;
}
