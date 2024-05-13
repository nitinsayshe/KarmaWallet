import {
  Schema,
  model,
  Model,
} from 'mongoose';
import { IModel } from '../../types/model';
import { ISubscription, ISubscriptionDocument } from './types';
import { getUtcDate } from '../../lib/date';

export type ISubscriptionModel = IModel<ISubscription>;

const SubscriptionSchema = new Schema({
  amount: { type: Number, required: true },
  name: { type: String, required: true },
  createdOn: { type: Date, default: getUtcDate().toDate() },
  lastModified: { type: Date, default: getUtcDate().toDate() },
  // not sure what all we will have here just yet
  integrations: {
    stripe: {
      productId: { type: String, required: true },
    },
  },
});

export const SubscriptionModel = model<ISubscriptionDocument, Model<ISubscription>>('subscription', SubscriptionSchema);
