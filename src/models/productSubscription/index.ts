import {
  Schema,
  model,
  Model,
} from 'mongoose';
import { IModel } from '../../types/model';
import { IProductSubscription, IProductSubscriptionDocument, ProductSubscriptionType } from './types';
import { getUtcDate } from '../../lib/date';

export type IProductSubscriptionModel = IModel<IProductSubscription>;

const ProductSubscriptionSchema = new Schema({
  amount: { type: String, required: true },
  name: { type: String, required: true },
  createdOn: { type: Date, default: getUtcDate().toDate() },
  lastModified: { type: Date, default: getUtcDate().toDate() },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  type: { type: String, enum: Object.values(ProductSubscriptionType), required: true },
  link: { type: String },
  // not sure what all we will have here just yet
  integrations: {
    stripe: {
      type: Schema.Types.Mixed,
    },
  },
});

export const ProductSubscriptionModel = model<IProductSubscriptionDocument, Model<IProductSubscription>>('product_subscription', ProductSubscriptionSchema);
