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
import { ISector, ISectorDocument } from './sector';
import { IShareableUser, IUserDocument } from './user';

export enum MatchTypes {
  Offset = 'offset',
}

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
  payment_channel?: string;
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

export interface IUserOrGroup {
  user?: IRef<ObjectId, (IShareableUser | IUserDocument)>;
  group?: IRef<ObjectId, (IShareableGroup | IGroupDocument)>;
}

export interface ITransactionMatch {
  status: boolean;
  amount: number;
  matcher: IUserOrGroup;
  date: Date;
}

export interface IShareableTransaction {
  user: IRef<ObjectId, IShareableUser>;
  company: IRef<ObjectId, IShareableCompany>;
  card: IRef<ObjectId, IShareableCard>;
  sector: IRef<ObjectId, ISector>;
  amount: number;
  date: Date;
  integrations?: ITransactionIntegrations;
  createdOn: Date;
  lastModified: Date;
  matchType: MatchTypes;
}

export interface ITransaction extends IShareableTransaction {
  user: IRef<ObjectId, IUserDocument>;
  userId: IRef<ObjectId, IUserDocument>;
  company: IRef<ObjectId, ICompanyDocument>;
  companyId: IRef<ObjectId, ICompanyDocument>;
  card: IRef<ObjectId, ICardDocument>;
  cardId: IRef<ObjectId, ICardDocument>;
  sector: IRef<ObjectId, ISectorDocument>;
  onBehalfOf?: IUserOrGroup;
  matched?: ITransactionMatch;
  association?: IUserOrGroup;
}

export interface ITransactionAggregate extends ITransaction {
  total: number
}

export interface ITransactionDocument extends ITransaction, Document {}
export type ITransactionModel = IModel<ITransaction>;

// TODO: remove the following after tongass is launched and
// transactions have been cleaned:
//   - userId
//   - companyId
//   - cardId
//   - category
//   - subCategory
//   - carbonMultiplier

const transactionSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'user',
  },
  company: {
    type: Schema.Types.ObjectId,
    ref: 'company',
  },
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'company',
  },
  card: {
    type: Schema.Types.ObjectId,
    ref: 'card',
  },
  cardId: {
    type: Schema.Types.ObjectId,
    ref: 'card',
  },
  category: { type: Number },
  subCategory: { type: Number },
  sector: {
    type: Schema.Types.ObjectId,
    ref: 'sector',
  },
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
  matchType: { type: String, enum: Object.values(MatchTypes) },
  /**
   * donations can be associated with specific entities
   * for matchings purposes.
   */
  association: {
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
});

export const TransactionModel = model<ITransactionDocument, Model<ITransaction>>('transaction', transactionSchema);
