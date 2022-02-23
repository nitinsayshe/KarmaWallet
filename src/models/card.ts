import {
  Schema,
  model,
  Document,
  Model,
} from 'mongoose';
import { CardStatus } from '../lib/constants';
import { IModel } from '../types/model';

export interface IPlaidCardIntegration {
  accessToken: string;
  accountId: string;
  items: string[];
  publicToken: string;
  linkSessionId: string;
  institutionId: string;
}

export interface IRareCardIntegration {
  userId: string;
  card_id: string;
  card_type: string;
  last_four: string;
  expr_month: number;
  expr_year: number;
}

export interface ICardIntegrations {
  plaid: IPlaidCardIntegration;
  rare: IRareCardIntegration;
}

export interface ICard {
  userId: Schema.Types.ObjectId;
  name: string;
  mask: string;
  type: string;
  subtype: string;
  status: CardStatus;
  institution: string;
  integrations: ICardIntegrations;
  createdOn: Date;
  lastModified: Date;
}

export interface ICardDocument extends ICard, Document {}
export type ICardModel = IModel<ICard>;

const cardSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  name: { type: String },
  mask: { type: String },
  type: { type: String },
  subtype: { type: String },
  status: {
    type: String,
    required: true,
    enum: Object.values(CardStatus),
  },
  institution: { type: String },
  integrations: {
    plaid: {
      type: {
        accessToken: { type: String },
        accountId: { type: String },
        items: [{ type: String }],
        publicToken: { type: String },
        linkSessionId: { type: String },
        institutionId: { type: String },
      },
    },
    rare: {
      type: {
        userId: { type: String },
        card_id: { type: String },
        card_type: { type: String },
        last_four: { type: String },
        expr_month: { type: Number },
        expr_year: { type: Number },
      },
    },
  },
  createdOn: { type: Date },
  lastModified: { type: Date },
});

export const CardModel = model<ICardDocument, Model<ICard>>('card', cardSchema);
