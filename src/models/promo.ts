import {
  Schema,
  model,
  Document,
  Model,
  ObjectId,
} from 'mongoose';
import { IModel } from '../types/model';
import { getUtcDate } from '../lib/date';
import { ICampaign, IShareableCampaign } from './campaign';

export enum IPromoTypes {
  CASHBACK = 'cashback',
  GIFTCARD = 'giftcard',
  OTHER = 'other',
}

export interface IPromo {
  _id: ObjectId;
  name: string;
  headerText: string;
  promoText: string;
  successText: string;
  type: IPromoTypes;
  disclaimerText: string;
  enabled: boolean;
  startDate: Date;
  endDate: Date;
  limit: number;
  amount: number;
  campaign?: ICampaign;
  // add slots array for FE to display (will use names like createAccountTop, createAccountBottom, etc)
  // slots: string[];
  // add text slots object with keys for these display slots
  /*
    {
      createAccountTop: { description: 'Create Account Top', text: 'Create Account Top Text' },
    }
  */
}

export interface IShareablePromo {
  _id: ObjectId;
  name: string;
  type: IPromoTypes;
  headerText: string;
  successText: string;
  promoText: string;
  disclaimerText: string;
  enabled: boolean;
  limit: number;
  amount: number;
  campaign?: IShareableCampaign;
}

export interface IPromoDocument extends IPromo, Document {
  _id: ObjectId;
}

export type IPromoModel = IModel<IPromo>;

const promoSchema = new Schema({
  name: { type: String, required: true },
  promoText: { type: String, required: true },
  headerText: { type: String, required: true },
  successText: { type: String, required: true },
  disclaimerText: { type: String, required: false },
  type: { type: String, required: true, enum: Object.values(IPromoTypes) },
  startDate: { type: Date, default: () => getUtcDate() },
  expiration: { type: Date },
  enabled: { type: Boolean, default: true },
  limit: { type: Number, default: 1 },
  amount: { type: Number, default: 0 },
  campaign: { type: Schema.Types.ObjectId, ref: 'campaign' },
});

export const PromoModel = model<IPromoDocument, Model<IPromo>>('promo', promoSchema);
