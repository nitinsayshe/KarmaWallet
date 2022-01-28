import {
  Schema,
  model,
  Document,
  Model,
} from 'mongoose';
import { IModel } from '../../types/model';
import schemaDefinition from '../schema/transaction';
import { ICardDocument } from './card';
import { IPlaidCategoryMappingDocument } from './plaidCategoryMapping';

export interface IPlaidTransactionLocation {
  address: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  postal_code: string;
  region: string;
  store_number: string;
}

export interface IPlaidTransactionMeta {
  reference_number: string;
  ppd_id: string;
  payee: string;
  by_order_of: string;
  payer: string;
  payment_method: string;
  payment_processor: string;
  reason: string;
}

export interface IPlaidTransactionFinanceCategory {
  primary: string;
  detailed: string;
}

export interface IPlaidTransactionIntegration {
  account_id?: string;
  account_owner?: string;
  authorized_date?: string;
  authorized_datetime?: string;
  category?: string[];
  category_id?: string;
  check_number?: string;
  iso_currency_code?: string;
  location?: IPlaidTransactionLocation;
  merchant_name?: string;
  name?: string;
  payment_channet?: string;
  payment_meta?: IPlaidTransactionMeta;
  pending?: boolean;
  pending_transaction_id?: string;
  personal_finance_category?: IPlaidTransactionFinanceCategory;
  transaction_code?: string;
  transaction_id?: string;
  transaction_type?: string;
  unofficial_currency_code?: string;
}

export interface IRareTransactionIntegration {
  transaction_id?: string;
  currency?: string;
  certificate_url?: string;
  statement_descriptor?: string;
  processed?: boolean;
  processed_ts?: string;
  refunded?: boolean;
  refunded_ts?: string;
  projectName?: string;
  offsetsPurchased?: string;
}

export interface ITransactionIntegrations {
  plaid?: IPlaidTransactionIntegration;
  rare?: IRareTransactionIntegration;
}

export interface ITransaction {
  userId: string;
  companyId: number;
  cardId: ICardDocument['_id'];
  category: number;
  subCategory: number;
  carbonMultiplier: IPlaidCategoryMappingDocument['_id'];
  amount: number;
  date: Date;
  integrations?: ITransactionIntegrations;
  createdOn: Date;
  lastModified: Date;
}

export interface ITransactionDocument extends ITransaction, Document {}
export type ITransactionModel = IModel<ITransaction>;

export const TransactionModel = model<ITransactionDocument, Model<ITransaction>>('transaction', new Schema(schemaDefinition));
