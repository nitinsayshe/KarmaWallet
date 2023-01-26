import {
  Schema,
  model,
  Document,
  Model,
  ObjectId,
} from 'mongoose';
import { IModel } from '../types/model';
import { getUtcDate } from '../lib/date';

export interface IPromo {
  name: string;
  promoText: string;
  disclaimerText: string;
  enabled: boolean;
  startDate: Date;
  endDate: Date;
  limit: number;
  amount: number;
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
  rewardAmount: { type: Number, default: 0 },
});

export const PromoModel = model<IPromoDocument, Model<IPromo>>('promo', promoSchema);
