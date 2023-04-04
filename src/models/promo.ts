import {
  Schema,
  model,
  Document,
  Model,
  ObjectId,
} from 'mongoose';
import { IModel } from '../types/model';
import { ICampaign, IShareableCampaign } from './campaign';

export enum IPromoTypes {
  CASHBACK = 'cashback',
  GIFTCARD = 'giftcard',
  OTHER = 'other',
}
// event that should trigger the promo
export enum IPromoEvents {
  CREATE_ACCOUNT = 'Create Account',
  LINK_CARD = 'Link Card',
}

export interface IPromo {
  _id: ObjectId;
  amount: number;
  campaign?: ICampaign;
  disclaimerText: string;
  enabled: boolean;
  endDate?: Date;
  events: IPromoEvents[];
  headerText: string;
  imageUrl?: string;
  limit: number;
  name: string;
  promoText: string;
  startDate?: Date;
  successText: string;
  type: IPromoTypes;
}

export interface IShareablePromo {
  _id: ObjectId;
  amount: number;
  campaign?: IShareableCampaign;
  events: IPromoEvents[];
  disclaimerText: string;
  enabled: boolean;
  endDate?: Date;
  headerText: string;
  imageUrl?: string;
  limit: number;
  name: string;
  promoText: string;
  startDate?: Date;
  successText: string;
  type: IPromoTypes;
}

export interface IPromoDocument extends IPromo, Document {
  _id: ObjectId;
}

export type IPromoModel = IModel<IPromo>;

const promoSchema = new Schema({
  amount: { type: Number, default: 0 },
  campaign: { type: Schema.Types.ObjectId, ref: 'campaign' },
  disclaimerText: { type: String, required: false },
  enabled: { type: Boolean, default: true },
  endDate: { type: Date },
  events: { type: [String], required: true, enum: Object.values(IPromoEvents) },
  headerText: { type: String, required: true },
  imageUrl: { type: String },
  limit: { type: Number, default: 1 },
  name: { type: String, required: true },
  promoText: { type: String, required: true },
  startDate: { type: Date },
  successText: { type: String, required: true },
  type: { type: String, required: true, enum: Object.values(IPromoTypes) },
});

export const PromoModel = model<IPromoDocument, Model<IPromo>>('promo', promoSchema);
