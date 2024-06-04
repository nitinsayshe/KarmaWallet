import { ObjectId, Document } from 'mongoose';
import Stripe from 'stripe';

export interface IShareableMembershipPromo {
  _id?: ObjectId;
  code: string;
  status: 'active' | 'inactive';
  createdOn: Date;
  expiresOn: Date;
  lastModified: Date;
  integrations?: {
    stripe?: Stripe.PromotionCode;
  }
}

export interface IMembershipPromo extends IShareableMembershipPromo {}

export interface IMembershipPromoDocument extends IMembershipPromo, Document {
  _id: ObjectId;
}
