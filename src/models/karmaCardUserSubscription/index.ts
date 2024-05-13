import {
  Schema,
  model,
  Model,
} from 'mongoose';
import { IModel } from '../../types/model';
import { IKarmaCardUserSubscription, IKarmaCardUserSubscriptionDocument } from './types';

export type IKarmaCardUserSubscriptionModel = IModel<IKarmaCardUserSubscription>;

const KarmaCardUserSubscriptionSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  createdOn: { type: Date, default: Date.now },
  lastModified: { type: Date, default: Date.now },
  expirationDate: { type: Date, required: true },
  lastBilledDate: { type: Date, required: true },
  status: { type: String, required: true },
  integrations: {
    stripe: {
      productId: { type: String, required: true },
    },
  },
});

export const KarmaCardUserSubscriptionModel = model<IKarmaCardUserSubscriptionDocument, Model<IKarmaCardUserSubscription>>('karmacard_user_subscription', KarmaCardUserSubscriptionSchema);
