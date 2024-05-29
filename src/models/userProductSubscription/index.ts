import {
  Schema,
  model,
  Model,
} from 'mongoose';
import { IModel } from '../../types/model';
import { IUserProductSubscription, IUserProductSubscriptionDocument } from './types';
import { getUtcDate } from '../../lib/date';

export type IUserProductSubscriptionModel = IModel<IUserProductSubscription>;

const UserProductSubscriptionSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  createdOn: { type: Date, default: getUtcDate().toDate() },
  lastModified: { type: Date, default: getUtcDate().toDate() },
  expirationDate: { type: Date, required: true },
  lastBilledDate: { type: Date, required: true },
  nextBillingDate: { type: Date, required: true },
  status: { type: String, required: true },
  productSubscription: {
    type: Schema.Types.ObjectId,
    ref: 'product_subscription',
    required: true,
  },
  // not sure what all we will have here just yet
  integrations: {
    stripe: {
      type: Schema.Types.Mixed,
    },
  },
});

export const UserProductSubscriptionModel = model<IUserProductSubscriptionDocument, Model<IUserProductSubscription>>('user_product_subscription', UserProductSubscriptionSchema);
