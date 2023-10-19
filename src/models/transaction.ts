import { Document, model, ObjectId, Schema } from 'mongoose';
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2';
import mongoosePaginate from 'mongoose-paginate-v2';
import { EarnedRewardTransaction, TransactionStatus } from '../clients/kard';
import {
  TransactionModel as MarqetaTransactionModel,
  TransactionModelStateEnum,
  TransactionModelStateEnumValues,
} from '../clients/marqeta/types';
import { getUtcDate } from '../lib/date';
import { IAggregatePaginateModel } from '../sockets/types/aggregations';
import { IModel, IRef } from '../types/model';
import { ICardDocument, IShareableCard } from './card';
import { ICompanyDocument, IShareableCompany } from './company';
import { IGroupDocument, IShareableGroup } from './group';
import { ISector, ISectorDocument } from './sector';
import { IShareableUser, IUserDocument } from './user';

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

export type IMarqetaTransactionIntegration = Partial<MarqetaTransactionModel> & {clearing?: Partial<MarqetaTransactionModel>};

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
  sector: IRef<ObjectId, ISector>;
  amount: number;
  status: TransactionModelStateEnumValues;
  reversed: boolean;
  date: Date;
  integrations?: ITransactionIntegrations;
  createdOn: Date;
  lastModified: Date;
  matchType: MatchTypes;
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
}

export interface ITransactionAggregate extends ITransaction {
  total: number;
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

/* export const marqetaIntegrationSchemaDefinition = { */
/*   type: { */
/*     identifier: { type: String }, */
/*     token: { type: String }, */
/*     user_token: { type: String }, */
/*     business_token: { type: String }, */
/*     acting_user_token: { type: String }, */
/*     card_token: { type: String }, */
/*     card_product_token: { type: String }, */
/*     is_preauthorization: { type: Boolean }, */
/*     deferred_settlement_days: { type: String }, */
/*     national_net_cpd_of_original_txn: { type: String }, */
/*     type: { type: String, enum: Object.values(TransactionModelTypeEnum) }, */
/*     state: { type: String, enum: Object.values(TransactionModelStateEnum) }, */
/*     duration: { type: Number }, */
/*     created_time: { type: String }, */
/*     user_transaction_time: { type: String }, */
/*     settlement_date: { type: String }, */
/*     request_amount: { type: Number }, */
/*     amount: { type: Number }, */
/*     cash_back_amount: { type: Number }, */
/*     currency_conversion: { */
/*       type: { */
/*         network: { */
/*           type: { */
/*             original_amount: { type: Number }, */
/*             conversion_rate: { type: Number }, */
/*             original_currency_code: { type: String }, */
/*             dynamic_currency_converison: { type: Boolean }, */
/*             settlementData: { */
/*               type: { */
/*                 amount: { type: Number }, */
/*                 conversion_rate: { type: Number }, */
/*                 currency_code: { type: String }, */
/*               }, */
/*             }, */
/*           }, */
/*         }, */
/*       }, */
/*     }, */
/*     issuer_interchange_amount: { type: Number }, */
/*     currency_code: { type: String }, */
/*     approval_code: { type: String }, */
/*     // response: { type: String }, */
/*     preceding_related_transaction_token: { type: String }, */
/*     preceding_transaction: { */
/*       type: { */
/*         amount: { type: Number }, */
/*         token: { type: String }, */
/*       }, */
/*     }, */
/*     amount_to_be_released: { type: Number }, */
/*     incremental_authorization_transaction_tokens: { type: [String] }, */
/*     merchant: { */
/*       type: { */
/*         name: { type: String }, */
/*         active: { type: Boolean }, */
/*         contact: { type: { String } }, */
/*         contact_email: { type: String }, */
/*         longitude: { type: Number }, */
/*         latitude: { type: Number }, */
/*         address1: { type: String }, */
/*         address2: { type: String }, */
/*         city: { type: String }, */
/*         state: { type: String }, */
/*         province: { type: String }, */
/*         zip: { type: String }, */
/*         phone: { type: String }, */
/*         country: { type: String }, */
/*         token: { type: String }, */
/*         partial_auth_flag: { type: Boolean }, */
/*         created_time: { type: String }, */
/*         last_modified_time: { type: String }, */
/*       }, */
/*     }, */
/*     store: { */
/*       type: { */
/*         name: { type: String }, */
/*         active: { type: Boolean }, */
/*         contact: { type: { String } }, */
/*         contact_email: { type: String }, */
/*         longitude: { type: Number }, */
/*         latitude: { type: Number }, */
/*         address1: { type: String }, */
/*         address2: { type: String }, */
/*         city: { type: String }, */
/*         state: { type: String }, */
/*         province: { type: String }, */
/*         zip: { type: String }, */
/*         postal_code: { type: String }, */
/*         phone: { type: String }, */
/*         country: { type: String }, */
/*         token: { type: String }, */
/*         partial_auth_flag: { type: Boolean }, */
/*         mid: { type: String }, */
/*         network_mid: { type: String }, */
/*         merchant_token: { type: String }, */
/*         partial_approval_capable: { type: Boolean }, */
/*         keyed_auth_cvv_enforced: { type: Boolean }, */
/*         created_time: { type: String }, */
/*         last_modified_time: { type: String }, */
/*       }, */
/*     }, */
/*     card_acceptor: { */
/*       type: { */
/*         mid: { type: String }, */
/*         mcc: { type: String }, */
/*         network_mid: { type: String }, */
/*         mcc_groups: { type: [String] }, */
/*         special_merchant_id: { type: String }, */
/*         merchant_tax_id: { type: String }, */
/*         name: { type: String }, */
/*         address: { type: String }, */
/*         city: { type: String }, */
/*         state: { type: String }, */
/*         postal_code: { type: String }, */
/*         country_code: { type: String }, */
/*         poi: { */
/*           type: { */
/*             tid: { type: String }, */
/*             partial_approval_capable: { type: String }, */
/*             cardholder_presence: { type: String }, */
/*             card_presence: { type: String }, */
/*             processing_type: { type: String }, */
/*             pin_preset: { type: String }, */
/*             special_condition_indicator: { */
/*               type: String, */
/*               enum: Object.values(TerminalModelSpecialConditionIndicatorEnum), */
/*             }, */
/*           }, */
/*         }, */
/*         payment_facilitator_id: { type: String }, */
/*         independent_sales_organization_id: { type: String }, */
/*         sub_merchant_id: { type: String }, */
/*         network_assigned_id: { type: String }, */
/*         country_of_origin: { type: String }, */
/*         transfer_service_provider_name: { type: String }, */
/*         payment_facilitator_name: { type: String }, */
/*         phone: { type: String }, */
/*         url: { type: String }, */
/*         customer_service_phone: { type: String }, */
/*       }, */
/*     }, */
/*     gpa: { */
/*       type: { */
/*         currency_code: { type: String }, */
/*         ledger_balance: { type: Number }, */
/*         available_balance: { type: Number }, */
/*         credit_balance: { type: Number }, */
/*         cached_balance: { type: Number }, */
/*         pending_credits: { type: Number }, */
/*         impacted_amount: { type: Number }, */
/*         balances: { */
/*           // this one should probably be mapped to an array and saved as one */
/*           type: [Map], */
/*           of: { */
/*             type: {}, */
/*           }, */
/*         }, */
/*         last_updated_time: { type: String }, */
/*       }, */
/*     }, */
/*     card: { */
/*       // TODO: Do we want to omit sensitive card data here or use tokenization? */
/*       type: { */
/*         created_time: { type: String }, */
/*         last_modified_time: { type: String }, */
/*         token: { type: String }, */
/*         user_token: { type: String }, */
/*         card_product_token: { type: String }, */
/*         last_four: { type: String }, */
/*         pan: { type: String }, */
/*         expiration: { type: String }, */
/*         expiration_time: { type: String }, */
/*         cvv_number: { type: String }, */
/*         chip_cvv_number: { type: String }, */
/*         barcode: { type: String }, */
/*         pin_is_set: { type: Boolean }, */
/*         state: { type: String, enum: Object.values(CardResponseStateEnum) }, */
/*         state_reason: { type: String }, */
/*         fullfillment_status: { type: String, enum: Object.values(CardResponseFulfillmentStatusEnum) }, */
/*         reissue_pan_from_card_token: { type: String }, */
/*         new_pan_from_card_token: { type: String }, */
/*         // fulfillment: // TODO: is this ok to omit? */
/*         bulk_issue_token: { type: String }, */
/*         translate_pin_from_card_token: { type: String }, */
/*         activation_actions: { */
/*           type: { */
/*             terminate_reissued_source_card: { type: Boolean }, */
/*             swap_digital_wallet_tokens_from_card_token: { type: String }, */
/*           }, */
/*         }, */
/*         instrument_type: { type: String, enum: Object.values(CardResponseInstrumentTypeEnum) }, */
/*         expedite: { type: Boolean }, */
/*         metadata: { type: Map, of: String }, */
/*         contactless_exemption_counter: { type: Number }, */
/*         contactless_exemption_total_amount: { type: Number }, */
/*       }, */
/*     }, */
/*     // gpa_order_unload */
/*     // gpa_order */
/*     // program_transfer */
/*     // fee_response */
/*     // peer_transfer */
/*     // msa_orders */
/*     // msa_order_unload */
/*     // offer_orders */
/*     // auto_reload */
/*     // direct_deposit */
/*     // pull_from_card */
/*     // polarity: { type: String, enum: Object.values(TransactionModelPolarityEnum) }, */
/*     // */
/*     // real_time_fee_group - this one should be mapped to an array from a Set */
/**/
/*     // 'fee'?: Fee; */
/*     // 'chargeback'?: ChargebackResponse; */
/*     // 'dispute'?: DisputeModel; */
/*     network: { type: String }, */
/*     subnetwork: { type: String }, */
/*     // 'network_metadata'?: NetworkMetadata; */
/*     acquirer_fee_amount: { type: Number }, */
/*     // 'fees'?: Array<NetworkFeeModel>; */
/*     // 'digital_wallet_token'?: DigitalWalletToken; */
/*     // 'user'?: CardholderMetadata; */
/*     // 'business'?: BusinessMetadata; */
/*     // 'acquirer'?: Acquirer; */
/*     // 'fraud'?: FraudView; */
/*     // 'pos'?: Pos; */
/*     // 'address_verification'?: AddressVerificationModel; */
/*     // 'card_security_code_verification'?: CardSecurityCodeVerification; */
/*     // 'transaction_metadata'?: TransactionMetadata; */
/*     // 'original_credit'?: OriginalCredit; */
/*     // 'account_funding'?: AccountFunding; */
/*     // 'card_holder_model'?: UserCardHolderResponse; */
/*     standin_approved_by: { type: String }, */
/*     standin_by: { type: String }, */
/*     standin_reason: { type: String }, */
/*     network_reference_id: { type: String }, */
/*     acquirer_reference_id: { type: String }, */
/*     // 'cardholder_authentication_data'?: CardholderAuthenticationData; */
/*     transaction_attributes: { type: Map, of: String }, */
/*     clearing_record_sequence_number: { type: String }, */
/*     issuer_received_time: { type: String }, */
/*     issuer_payment_node: { type: String }, */
/*     // 'program'?: Program; */
/*     batch_number: { type: String }, */
/*     from_account: { type: String }, */
/*     multi_clearing_sequence_number: { type: String }, */
/*     multi_clearing_sequence_count: { type: String }, */
/*     isaIndicator: { type: String, enum: Object.values(TransactionModelIsaIndicatorEnum) }, */
/*     enhanced_data_token: { type: String }, */
/*     advice_reason_code: { type: String }, */
/*     advice_reason_details: { type: String }, */
/*     bank_transfer_token: { type: String }, */
/*     interchange_rate_descriptor: { type: String }, */
/*     fee_type: { type: String }, */
/*     // 'atc_information'?: ATCInformationModel; */
/*     local_transaction_date: { type: String }, */
/*   }, */
/* }; */

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
  status: { type: String, enum: Object.values(TransactionModelStateEnum) },
  date: { type: Date },
  // if true, means this transaction was cancelled, bounced
  // refunded, or otherwise not processed.
  reversed: { type: Boolean },
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
