import {
  Schema,
  model,
  Model,
} from 'mongoose';
import { IModel } from '../../types/model';
import { IUserSubscription, IUserSubscriptionDocument } from './types';
import { getUtcDate } from '../../lib/date';

export type IUserSubscriptionModel = IModel<IUserSubscription>;

const UserSubscriptionSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  createdOn: { type: Date, default: getUtcDate().toDate() },
  lastModified: { type: Date, default: getUtcDate().toDate() },
  expirationDate: { type: Date, required: true },
  lastBilledDate: { type: Date, required: true },
  status: { type: String, required: true },
  subscription: {
    type: Schema.Types.ObjectId,
    ref: 'subscription',
    required: true,
  },
  // not sure what all we will have here just yet
  integrations: {
    stripe: {
      productId: { type: String, required: true },
    },
  },
});

export const UserSubscriptionModel = model<IUserSubscriptionDocument, Model<IUserSubscription>>('user_subscription', UserSubscriptionSchema);
