import {
  Schema,
  model,
  Model,
} from 'mongoose';
import { IModel } from '../../types/model';
import { IMembershipPromo, IMembershipPromoDocument } from './types';
import { getUtcDate } from '../../lib/date';

export type IMembershipPromoModel = IModel<IMembershipPromo>;

const MembershipPromoSchema = new Schema({
  code: { type: String, required: true },
  createdOn: { type: Date, default: getUtcDate().toDate() },
  lastModified: { type: Date, default: getUtcDate().toDate() },
  expiresOn: { type: Date },
  status: { type: String, enum: ['active', 'inactive'] },
  // not sure what all we will have here just yet
  integrations: {
    stripe: {
      type: Schema.Types.Mixed,
    },
  },
});

export const MembershipPromoModel = model<IMembershipPromoDocument, Model<IMembershipPromo>>('membership_promo', MembershipPromoSchema);
