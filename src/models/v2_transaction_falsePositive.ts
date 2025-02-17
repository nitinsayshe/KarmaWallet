import {
  Schema,
  model,
  Document,
  ObjectId,
  PaginateModel,
} from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { IModel } from '../types/model';
import { PlaidCompanyMatchType } from '../lib/constants/plaid';
import { getUtcDate } from '../lib/date';

export interface IV2TransactionFalsePositive {
  value: string;
  matchType: PlaidCompanyMatchType;
  originalValue: string;
  company: ObjectId;
  createdOn: Date;
  lastModified: Date;
}

export interface IV2TransactionFalsePositiveDocument extends IV2TransactionFalsePositive, Document {}
export type IV2TransactionFalsePositiveModel = IModel<IV2TransactionFalsePositive>;

const V2TransactionFalsePositiveSchema = new Schema({
  matchType: { type: String, required: true, enum: Object.values(PlaidCompanyMatchType) },
  originalValue: { type: String, required: true },
  company: { type: Schema.Types.ObjectId,
    ref: 'company',
  },
  createdOn: { type: Date, default: () => getUtcDate() },
  lastModified: { type: Date, default: () => getUtcDate() },
});

V2TransactionFalsePositiveSchema.plugin(mongoosePaginate);

export const V2TransactionFalsePositiveModel = model<IV2TransactionFalsePositiveDocument, PaginateModel<IV2TransactionFalsePositive>>('v2_transaction_false_positive', V2TransactionFalsePositiveSchema);
