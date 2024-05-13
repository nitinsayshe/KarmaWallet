import {
  Schema,
  model,
  Model,
} from 'mongoose';
import { IModel } from '../../types/model';
import { IKarmaCardSubscription, IKarmaCardSubscriptionDocument } from './types';

export type IKarmaCardSubscriptionModel = IModel<IKarmaCardSubscription>;

const KarmaCardSubscriptionSchema = new Schema({
  amount: { type: Number, required: true },
  name: { type: String, required: true },
  createdOn: { type: Date, default: Date.now },
  lastModified: { type: Date, default: Date.now },
  // not sure what all we will have here just yet
  integrations: {
    stripe: {
      productId: { type: String, required: true },
    },
  },
});

export const KarmaCardSubscriptionModel = model<IKarmaCardSubscriptionDocument, Model<IKarmaCardSubscription>>('karmacard_subscription', KarmaCardSubscriptionSchema);
