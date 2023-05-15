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

export interface IV2TransactionMatchedCompanyName {
  value: string;
  matchType: PlaidCompanyMatchType;
  originalValue: string;
  company: ObjectId;
  createdOn: Date;
  lastModified: Date;
}

export interface ITransactionMatchedCompanyNameDocument extends IV2TransactionMatchedCompanyName, Document {}
export type ITransactionMatchedCompanyNameModel = IModel<IV2TransactionMatchedCompanyName>;

const v2TransactionMatchedCompanyNameSchema = new Schema({
  value: { type: String, required: true },
  matchType: { type: String, required: true, enum: Object.values(PlaidCompanyMatchType) },
  originalValue: { type: String, required: true },
  company: { type: Schema.Types.ObjectId,
    ref: 'company',
    required: true,
  },
  createdOn: { type: Date, default: () => getUtcDate() },
  lastModified: { type: Date, default: () => getUtcDate() },
});

v2TransactionMatchedCompanyNameSchema.plugin(mongoosePaginate);

export const V2TransactionMatchedCompanyNameModel = model<ITransactionMatchedCompanyNameDocument, PaginateModel<IV2TransactionMatchedCompanyName>>('v2_transaction_matched_company_name', v2TransactionMatchedCompanyNameSchema);
