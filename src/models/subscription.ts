import {
  Document, model, ObjectId, PaginateModel, Schema,
} from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { getUtcDate } from '../lib/date';
import { IModel, IRef } from '../types/model';
import { SubscriptionCode, SubscriptionStatus } from '../types/subscription';
import { IShareableUser, IUser } from './user';
import { IShareableVisitor, IVisitor } from './visitor';

export interface IShareableSubscription {
  code: string;
  status: SubscriptionStatus;
  createdOn: Date;
}

export interface ISubscription extends IShareableSubscription {
  user?: IRef<ObjectId, (IShareableUser | IUser)>;
  visitor?: IRef<ObjectId, (IShareableVisitor | IVisitor)>;
  lastModified: Date;
}

export interface ISubscriptionDocument extends ISubscription, Document {}
export type ISubscriptionModel = IModel<ISubscription>;

const subscriptionSchema = new Schema({
  code: {
    type: String,
    enum: Object.values(SubscriptionCode),
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
    enum: Object.values(SubscriptionStatus),
    required: true,
  },
  lastModified: { type: Date, default: () => getUtcDate() },
  createdOn: { type: Date, default: () => getUtcDate() },
});
subscriptionSchema.plugin(mongoosePaginate);

export const SubscriptionModel = model<ISubscriptionDocument, PaginateModel<ISubscription>>('subscription', subscriptionSchema);
