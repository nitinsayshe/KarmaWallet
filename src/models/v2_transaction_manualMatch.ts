import {
  Schema,
  model,
  Document,
  Model,
  ObjectId,
} from 'mongoose';
import { IModel } from '../types/model';
import { PlaidCompanyMatchType } from '../lib/constants/plaid';
import { getUtcDate } from '../lib/date';

export interface IV2TransactionManualMatch {
  value: string;
  matchType: PlaidCompanyMatchType;
  originalValue: string;
  company: ObjectId;
  createdOn: Date;
  lastModified: Date;
}

export interface IV2TransactionManualMatchDocument extends IV2TransactionManualMatch, Document {}
export type IV2TransactionManualMatchModel = IModel<IV2TransactionManualMatch>;

const V2TransactionManualMatchSchema = new Schema({
  matchType: { type: String, required: true, enum: Object.values({ ...PlaidCompanyMatchType }) },
  originalValue: { type: String, required: true },
  company: { type: Schema.Types.ObjectId,
    ref: 'company',
    required: true,
  },
  createdOn: { type: Date, default: () => getUtcDate() },
  lastModified: { type: Date, default: () => getUtcDate() },
});

export const V2TransactionManualMatchModel = model<IV2TransactionManualMatchDocument, Model<IV2TransactionManualMatch>>('v2_transaction_manual_match', V2TransactionManualMatchSchema);
