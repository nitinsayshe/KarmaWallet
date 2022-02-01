import {
  Schema,
  model,
  Document,
  Model,
} from 'mongoose';
import { TransactionsGetResponse } from 'plaid';
import { IModel } from '../types/model';

export interface IPlaidItemDocument extends TransactionsGetResponse, Document {
  _id: string; // required until we migrate to ObjectId
}
export type IPlaidItemModel = IModel<TransactionsGetResponse>;

const plaidItemSchema = new Schema({
  _id: { type: String, required: true },
  userId: { type: String, ref: 'user', required: true },
  public_token: { type: String, required: true },
  institution: { type: Object, required: true },
  account: { type: Object, required: true },
  account_id: { type: String, required: true },
  accounts: { type: Array, required: true },
  link_session_id: { type: String, required: true },
  access_token: { type: String, required: true },
  item_id: { type: String, required: true },
  dateCreated: { type: Date, default: () => Date.now() },
  transactions: { type: Array, default: [] },
  lastUpdated: { type: Date },
  status: { type: String },
  lastChecked: { type: Date, default: () => Date.now() },
  linkToken: { type: String },
  isDeleted: { type: Boolean, default: false },
  processingTransactions: { type: Boolean, default: true },
});

export const PlaidItemModel = model<IPlaidItemDocument, Model<TransactionsGetResponse>>('plaiditem', plaidItemSchema);
