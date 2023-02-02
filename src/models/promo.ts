import {
  Schema,
  model,
  Document,
  Model,
  ObjectId,
} from 'mongoose';
import { IModel, IRef } from '../types/model';
import { getUtcDate } from '../lib/date';
import { ICampaign } from './campaign';

export interface IPromo {
  name: string;
  promoText: string;
  disclaimerText: string;
  enabled: boolean;
  startDate: Date;
  endDate: Date;
  limit: number;
  amount: number;
  campaign: IRef<ObjectId, ICampaign>;
  // add slots array for FE to display (will use names like createAccountTop, createAccountBottom, etc)
  // slots: string[];
  // add text slots object with keys for these display slots
  /*
    {
      createAccountTop: { description: 'Create Account Top', text: 'Create Account Top Text' },
    }
  */
}

export interface IPromoDocument extends IPromo, Document {
  _id: ObjectId;
}

export type IPromoModel = IModel<IPromo>;

const promoSchema = new Schema({
  name: { type: String, required: true },
  promoText: { type: String, required: true },
  disclaimerText: { type: String, required: false },
  startDate: { type: Date, default: () => getUtcDate() },
  expiration: { type: Date },
  enabled: { type: Boolean, default: true },
  limit: { type: Number, default: 1 },
  amount: { type: Number, default: 0 },
  campaign: { type: Schema.Types.ObjectId,
    ref: 'campaign',
  },
});

export const PromoModel = model<IPromoDocument, Model<IPromo>>('promo', promoSchema);
