import { Schema, model, Document, Model, ObjectId } from 'mongoose';
import { CardStatus, KardEnrollmentStatus } from '../lib/constants';
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

export interface IKardIntegration {
  createdOn: Date;
  userId: string;
  enrollmentStatus: KardEnrollmentStatus;
}

export interface IMarqetaCardIntegration {
  token: string;
  expiration_time: Date;
  user_token: string;
  card_token: string,
  card_product_token: string;
  pan: string;
  last_four: string;
  expr_month: number;
  expr_year: number;
  created_time: Date;
  pin_is_set: boolean;
  state: string;
  instrument_type: string;
  barcode: string;
}

export interface ICardIntegrations {
  plaid?: IPlaidCardIntegration;
  rare?: IRareCardIntegration;
  kard?: IKardIntegration;
  marqeta?: IMarqetaCardIntegration[];
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
  unlinkedDate?: Date;
  removedDate?: Date;
  initialTransactionsProcessing: boolean;
  lastTransactionSync: Date;
  institutionId?: string;
  isEnrolledInAutomaticRewards?: boolean;
  integrations: ICardIntegrations;
}

export interface ICard extends IShareableCard {
  userId: IRef<ObjectId, IUserDocument>;
  lastFourDigitsToken?: string;
  binToken?: string;
}

export interface ICardDocument extends ICard, Document { }
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
    kard: {
      type: {
        createdOn: { type: Date },
        userId: { type: String },
        enrollmentStatus: {
          type: String,
          enum: Object.values(KardEnrollmentStatus),
        },
      },
    },
    marqeta: [{
      type: {
        user_token: { type: String },
        card_token: { type: String },
        card_product_token: { type: String },
        last_four: { type: String },
        pan: { type: String },
        expr_month: { type: Number },
        expr_year: { type: Number },
        pin_is_set: { type: Boolean },
        state: { type: String },
        barcode: { type: String },
        created_time: { type: Date },
        instrument_type: { type: String },
      },
    }],
  },
  initialTransactionsProcessing: { type: Boolean },
  createdOn: { type: Date },
  lastModified: { type: Date },
  lastTransactionSync: { type: Date },
  lastFourDigitsToken: { type: String },
  binToken: { type: String },
  unlinkedDate: { type: Date },
  removedDate: { type: Date },
});

export const CardModel = model<ICardDocument, Model<ICard>>('card', cardSchema);
