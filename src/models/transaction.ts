import { Document, model, ObjectId, Schema } from 'mongoose';
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2';
import mongoosePaginate from 'mongoose-paginate-v2';
import { TransactionStatus, EarnedRewardTransaction } from '../clients/kard/types';
import {
  DepositDepositResponseTypeEnumValues,
  TransactionModel as MarqetaTransactionModel,
  TransactionModelStateEnum,
  TransactionModelStateEnumValues,
} from '../clients/marqeta/types';
import {
  TransactionTypeEnumValues,
  TransactionTypeEnum,
  TransactionSubtypeEnumValues,
  TransactionSubtypeEnum,
} from '../lib/constants/transaction';
import { getUtcDate } from '../lib/date';
import { IAggregatePaginateModel } from '../sockets/types/aggregations';
import { IModel, IRef } from '../types/model';
import { ICardDocument, IShareableCard } from './card';
import { ICompanyDocument, IShareableCompany } from './company';
import { IGroupDocument, IShareableGroup } from './group';
import { ISector, ISectorDocument } from './sector';
import { IShareableUser } from './user/types';
import { IUserDocument } from './user';

export enum MatchTypes {
  Offset = 'offset',
}

export enum TransactionAssociationReasons {
  Reversed = 'reversed',
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
  date?: string;
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

export interface IKardTransactionIntegration {
  id?: string;
  status?: TransactionStatus;
  rewardData?: Partial<EarnedRewardTransaction>;
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
  fee_amt?: number;
  subtotal_amt?: number;
  tonnes_amt?: number;
}

export interface IMarqetaDirectDepositData {
  type: DepositDepositResponseTypeEnumValues;
  company_name: string;
}

export type IMarqetaTransactionIntegration = Partial<MarqetaTransactionModel> & {
  relatedTransactions?: Partial<MarqetaTransactionModel>[];
};

export interface ITransactionIntegrations {
  plaid?: IPlaidTransactionIntegration;
  rare?: IRareTransactionIntegration;
  kard?: IKardTransactionIntegration;
  marqeta?: IMarqetaTransactionIntegration;
}

export interface ITransactionAssociation {
  // eslint-disable-next-line no-use-before-define
  transaction: IRef<ObjectId, ITransactionDocument>;
  reason: TransactionAssociationReasons;
}

export interface IUserOrGroup {
  user?: IRef<ObjectId, IShareableUser | IUserDocument>;
  group?: IRef<ObjectId, IShareableGroup | IGroupDocument>;
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
  achTransfer?: any;
  sector: IRef<ObjectId, ISector>;
  amount: number;
  status: TransactionModelStateEnumValues;
  type?: TransactionTypeEnumValues;
  subType?: TransactionSubtypeEnumValues;
  reversed: boolean;
  date: Date;
  settledDate?: Date;
  integrations?: ITransactionIntegrations;
  earnedCommission?: {
    id: string;
    amount: number;
    karmaAllocation: number;
    userAllocation: number;
  };
  createdOn: Date;
  lastModified: Date;
  matchType: MatchTypes;
  sortableDate?: Date;
  group?: ObjectId;
}

export interface ITransaction extends IShareableTransaction {
  association?: IUserOrGroup;
  card: IRef<ObjectId, ICardDocument>;
  cardId: IRef<ObjectId, ICardDocument>;
  company: IRef<ObjectId, ICompanyDocument>;
  companyId: IRef<ObjectId, ICompanyDocument>;
  matched?: ITransactionMatch;
  onBehalfOf?: IUserOrGroup;
  sector: IRef<ObjectId, ISectorDocument>;
  transactionAssociations: ITransactionAssociation[];
  user: IRef<ObjectId, IUserDocument>;
  userId: IRef<ObjectId, IUserDocument>;
  group?: ObjectId;
}

export interface ITransactionAggregate extends ITransaction {
  total: number;
}

export interface ITransactionDocument extends ITransaction, Document { }
export type ITransactionModel = IModel<ITransaction>;

export const transactionSchemaDefinition = {
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
  achTransfer: {
    type: Schema.Types.ObjectId,
    ref: 'ach_transfer',
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
  group: {
    type: Schema.Types.ObjectId,
    ref: 'group',
  },
  amount: { type: Number },
  status: { type: String, enum: Object.values(TransactionModelStateEnum) },
  date: { type: Date },
  type: { type: String, enum: Object.values(TransactionTypeEnum) },
  subType: { type: String, enum: Object.values(TransactionSubtypeEnum) },
  // if true, means this transaction was cancelled, bounced
  // refunded, or otherwise not processed.
  reversed: { type: Boolean },
  settledDate: { type: Date },
  sortableDate: { type: Date },
  // use this to "link" 2 transactions together because they
  // are related in some way. Like a negative transaction
  // linked to the positive transaction because it was
  // reversed for some reason (like a refund).
  transactionAssociations: [
    {
      transaction: {
        type: Schema.Types.ObjectId,
        ref: 'transaction',
      },
      reason: {
        type: String,
        enum: Object.values(TransactionAssociationReasons),
      },
    },
  ],
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
        date: { type: String },
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
    kard: {
      type: {
        id: { type: String },
        status: { type: String, enum: Object.values(TransactionStatus) },
        rewardData: {
          type: {
            issuerTransactionId: { type: String },
            transactionId: { type: String },
            transactionAmountInCents: { type: Number },
            status: { type: String, enum: Object.values(TransactionStatus) },
            itemsOrdered: {
              type: [
                {
                  offerId: { type: String },
                  total: { type: Number },
                  quantity: { type: Number },
                  amount: { type: Number },
                  description: { type: String },
                  category: { type: String },
                  commissionToIssuer: { type: Number },
                },
              ],
            },
          },
        },
      },
    },
    marqeta: Schema.Types.Mixed,
  },
  createdOn: { type: Date, default: () => getUtcDate() },
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
};

const transactionSchema = new Schema(transactionSchemaDefinition);
transactionSchema.plugin(mongoosePaginate);
transactionSchema.plugin(mongooseAggregatePaginate);

export const TransactionModel = model<ITransactionDocument, IAggregatePaginateModel<ITransactionDocument>>(
  'transaction',
  transactionSchema,
);
