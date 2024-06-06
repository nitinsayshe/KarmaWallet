import {
  Document, model, ObjectId, PaginateModel, Schema,
} from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { getUtcDate } from '../lib/date';
import { IModel, IRef } from '../types/model';
import { MarketingSubscriptionCode, MarketingSubscriptionStatus } from '../types/marketing_subscription';
import { IShareableVisitor, IVisitor } from './visitor';
import { IShareableUser, IUser } from './user/types';

export interface IShareableMarketingSubscription {
  code: MarketingSubscriptionCode;
  status: MarketingSubscriptionStatus;
  createdOn: Date;
}

export interface IMarketingSubscription extends IShareableMarketingSubscription {
  user?: IRef<ObjectId, (IShareableUser | IUser)>;
  visitor?: IRef<ObjectId, (IShareableVisitor | IVisitor)>;
  lastModified: Date;
}

export interface IMarketingSubscriptionDocument extends IMarketingSubscription, Document {}
export type IMarketingMarketingSubscriptionModel = IModel<IMarketingSubscription>;

const marketingSubscriptionSchema = new Schema({
  code: {
    type: String,
    enum: Object.values(MarketingSubscriptionCode),
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'user',
  },
  visitor: {
    type: Schema.Types.ObjectId,
    ref: 'visitor',
  },
  status: {
    type: String,
    enum: Object.values(MarketingSubscriptionStatus),
    required: true,
  },
  lastModified: { type: Date, default: () => getUtcDate() },
  createdOn: { type: Date, default: () => getUtcDate() },
});
marketingSubscriptionSchema.plugin(mongoosePaginate);

export const MarketingSubscriptionModel = model<IMarketingSubscriptionDocument, PaginateModel<IMarketingSubscription>>('marketing_subscription', marketingSubscriptionSchema);
