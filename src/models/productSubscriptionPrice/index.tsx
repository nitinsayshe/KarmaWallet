import {
  Schema,
  model,
  Model,
} from 'mongoose';
import { IModel } from '../../types/model';
import { getUtcDate } from '../../lib/date';
import { IProductSubscriptionPrice, IProductSubscriptionPriceDocument } from './types';

export type IProductSubscriptionPriceModel = IModel<IProductSubscriptionPrice>;

const ProductSubscriptionPriceSchema = new Schema({
  createdOn: { type: Date, default: getUtcDate().toDate() },
  lastModified: { type: Date, default: getUtcDate().toDate() },
  active: { type: Boolean, default: true },
  productSubscription: { type: Schema.Types.ObjectId, ref: 'product_subscription' },
  amount: { type: String, required: true },

  // not sure what all we will have here just yet
  integrations: {
    stripe: {
      type: Schema.Types.Mixed,
    },
  },
});

export const ProductSubscriptionPriceModel = model<IProductSubscriptionPriceDocument, Model<IProductSubscriptionPrice>>('product_subscription_price', ProductSubscriptionPriceSchema);
