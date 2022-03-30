import {
  Schema,
  ObjectId,
  model,
  Document,
  Model,
} from 'mongoose';
import { IModel, IRef } from '../types/model';
import { ICardDocument, IShareableCard } from './card';
import { ICompanyDocument, IShareableCompany } from './company';
import { IGroupDocument, IShareableGroup } from './group';
import { IPlaidCategoryMapping, IPlaidCategoryMappingDocument } from './plaidCategoryMapping';
import { IShareableUser, IUserDocument } from './user';

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
  certificateUrl?: string; // added during some rare updates...has to be included now or will break FE
  statement_descriptor?: string;
  processed?: boolean;
  processed_ts?: string;
  refunded?: boolean;
  refunded_ts?: string;
  projectName?: string;
  fee_amt?: number,
  subtotal_amt?: number,
  tonnes_amt?: number,
}

export interface ITransactionIntegrations {
  plaid?: IPlaidTransactionIntegration;
  rare?: IRareTransactionIntegration;
}

export interface ITransactionOnBehalfOf {
  user: IRef<ObjectId, (IShareableUser | IUserDocument)>;
  group: IRef<ObjectId, (IShareableGroup | IGroupDocument)>;
}

export interface ITransactionMatcher {
  user: IRef<ObjectId, IUserDocument>;
  group: IRef<ObjectId, IGroupDocument>;
}

export interface ITransactionMatch {
  status: boolean;
  amount: number;
  matcher: ITransactionMatcher;
  date: Date;
}

export interface ITransactionAssociation {
  group: IRef<ObjectId, (IShareableGroup | IGroupDocument)>
}

export interface IShareableTransaction {
  userId: IRef<ObjectId, IShareableUser>;
  companyId: IRef<ObjectId, IShareableCompany>;
  cardId: IRef<ObjectId, IShareableCard>;
  carbonMultiplier: IRef<ObjectId, IPlaidCategoryMapping>;
  amount: number;
  date: Date;
  category: number;
  subCategory: number;
  createdOn: Date;
  lastModified: Date;
}

export interface ITransaction extends IShareableTransaction {
  userId: IRef<ObjectId, IUserDocument>;
  companyId: IRef<ObjectId, ICompanyDocument>;
  cardId: IRef<ObjectId, ICardDocument>;
  carbonMultiplier: IRef<ObjectId, IPlaidCategoryMappingDocument>;
  integrations?: ITransactionIntegrations;
  onBehalfOf?: ITransactionOnBehalfOf;
  matched?: ITransactionMatch;
  association?: ITransactionAssociation;
}

export interface ITransactionAggregate extends ITransaction {
  total: number
}

export interface ITransactionDocument extends ITransaction, Document {}
export type ITransactionModel = IModel<ITransaction>;

const transactionSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'company',
  },
  cardId: {
    type: Schema.Types.ObjectId,
    ref: 'card',
  },
  category: { type: Number },
  subCategory: { type: Number },
  carbonMultiplier: {
    type: Schema.Types.ObjectId,
    ref: 'plaid_category_mapping',
  },
  amount: { type: Number },
  date: { type: Date },
  integrations: {
    plaid: {
      type: {
        account_id: { type: String },
        account_owner: { type: String },
        authorized_date: { type: String },
        authorized_datetime: { type: String },
        category: [{ type: String }],
        category_id: { type: String },
        check_number: { type: Number },
        iso_currency_code: { type: String },
        location: { type: Object },
        merchant_name: { type: String },
        name: { type: String },
        payment_channel: { type: String },
        payment_meta: { type: Object },
        pending: { type: Boolean },
        pending_transaction_id: { type: String },
        personal_finance_category: { type: Object },
        transaction_code: { type: String },
        transaction_id: { type: String },
        transaction_type: { type: String },
        unofficial_currency_code: { type: String },
      },
    },
    rare: {
      type: {
        transaction_id: { type: String },
        currency: { type: String },
        certificate_url: { type: String },
        statement_descriptor: { type: String },
        processed: { type: Boolean },
        processed_ts: { type: String },
        refunded: { type: Boolean },
        refunded_ts: { type: String },
        projectName: { type: String },
        fee_amt: { type: Number },
        subtotal_amt: { type: Number },
        tonnes_amt: { type: Number },
      },
    },
  },
  createdOn: { type: Date },
  lastModified: { type: Date },
  /**
   * transactions can be made on behalf of others...setting
   * this specifies who this transaction was made for.
   */
  onBehalfOf: {
    type: {
      user: {
        type: Schema.Types.ObjectId,
        ref: 'user',
      },
      group: {
        type: Schema.Types.ObjectId,
        ref: 'group',
      },
    },
  },
  /**
   * some entities offer matching of certain transaction types
   * (like offset donations). if status is true, the transaction
   * has been matched.
   */
  matched: {
    type: {
      status: {
        type: Boolean,
        default: false,
      },
      amount: { type: Number },
      date: { type: Date },
      matcher: {
        type: {
          user: {
            type: Schema.Types.ObjectId,
            ref: 'user',
          },
          group: {
            type: Schema.Types.ObjectId,
            ref: 'group',
          },
        },
      },
    },
  },
  /**
   * donations can be associated with specific entities
   * for matchings purposes.
   */
  association: {
    type: {
      group: {
        type: Schema.Types.ObjectId,
        ref: 'group',
      },
    },
  },
});

export const TransactionModel = model<ITransactionDocument, Model<ITransaction>>('transaction', transactionSchema);
