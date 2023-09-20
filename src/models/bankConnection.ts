import { Schema, model, Document, Model, ObjectId } from 'mongoose';
import { KardEnrollmentStatus } from '../lib/constants';
import { getUtcDate } from '../lib/date';
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

export interface IBankIntegrations {
  plaid?: IPlaidCardIntegration;
}

export interface IShareableBank {
  userId: IRef<ObjectId, IShareableUser>;
  name: string;
  mask: string;
  type: string;
  subtype: string;
  institution: string;
  createdOn: Date;
  lastModified: Date;
  unlinkedDate?: Date;
  removedDate?: Date;
  initialTransactionsProcessing: boolean;
  lastTransactionSync: Date;
  institutionId?: string;
  isEnrolledInAutomaticRewards?: boolean;
  integrations: IBankIntegrations;
}

export interface IBank extends IShareableBank {
  userId: IRef<ObjectId, IUserDocument>;
  lastFourDigitsToken?: string;
  binToken?: string;
}

export interface IBankDocument extends IBank, Document { }
export type IBankModel = IModel<IBank>;

const bankSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  name: { type: String },
  mask: { type: String },
  type: { type: String },
  subtype: { type: String },
  logo: { type: String },
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
  },
  createdOn: { type: Date, default: () => getUtcDate().toDate() },
  lastModified: { type: Date, default: () => getUtcDate().toDate() },
});

export const BankModel = model<IBankDocument, Model<IBank>>('bank', bankSchema);
