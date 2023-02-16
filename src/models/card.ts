import {
  Schema,
  model,
  Document,
  Model,
  ObjectId,
} from 'mongoose';
import { CardStatus } from '../lib/constants';
import { IModel, IRef } from '../types/model';
import { IShareableUser, IUserDocument } from './user';

export interface IPlaidCardIntegration {
  accessToken: string;
  accountId: string;
  items: string[];
  publicToken: string;
  linkSessionId: string;
  institutionId: string;
  unlinkedAccessTokens: string[];
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

export interface IShareableCard {
  userId: IRef<ObjectId, IShareableUser>;
  name: string;
  mask: string;
  type: string;
  subtype: string;
  status: CardStatus;
  institution: string;
  createdOn: Date;
  lastModified: Date;
  removedDate?: Date;
  initialTransactionsProcessing: boolean;
  lastTransactionSync: Date;
}

export interface ICard extends IShareableCard {
  userId: IRef<ObjectId, IUserDocument>;
  integrations: ICardIntegrations;
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
        unlinkedAccessTokens: [{ type: String }],
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
  initialTransactionsProcessing: { type: Boolean },
  createdOn: { type: Date },
  lastModified: { type: Date },
  lastTransactionSync: { type: Date },
  removedDate: { type: Date },
});

export const CardModel = model<ICardDocument, Model<ICard>>('card', cardSchema);
