import { ObjectId } from 'mongoose';
import { Transaction } from 'plaid';
import { ChargebackResponseChannelEnumValues, ChargebackResponseStateEnumValues, TransactionModel } from '../../clients/marqeta/types';
import { ChargebackTypeEnumValues } from '../../lib/constants';

interface Identification {
  type: string;
  value: string;
}

// interface Metadata {
//   notification_email: string;
//   notification_language: string;
//   authentication_question1: string;
//   authentication_question2: string;
//   authentication_question3: string;
//   authentication_answer1: string;
//   authentication_answer2: string;
//   authentication_answer3: string;
// }

export interface IMarqetaUserToken {
  userToken: string;
}

export interface IMarqetaCreateUser {
  firstName: string;
  lastName: string;
  token?: string;
  email: string;
  identifications: Identification[];
  birthDate: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  // do we need this??
  // metadata: Metadata;
}

export interface IMarqetaUserAddress {
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface IMarqetaUpdateUser extends IMarqetaUserAddress {
  firstName?: string;
  lastName?: string;
  token?: string;
  email?: string;
  identifications?: Identification[];
  birthDate?: string;
  // do we need this??
  // metadata: Metadata;
}
export interface IMarqetaLookUp {
  email: string;
}
export interface IMarqetaUserTransition extends IMarqetaUserToken {
  channel: string;
  reason: string;
  reasonCode: string;
  status: string;
}

export interface IMarqetaCreateCard extends IMarqetaUserToken {
  cardProductToken: string;
}

export interface IMarqetaLoadGpaFromProgramFundingSource {
  amount: number;
  userId: string;
}

export interface IMarqetaCreateGPAorder extends IMarqetaUserToken {
  tags?: string; // comma separated list of tags
  amount: number;
  fees?: number;
  currencyCode: string;
  fundingSourceToken: string;
}

export const GpaOrderTagEnum = {
  CashbackPayout: 'cashback-payout',
  EmployerGifting: 'employer-gifting',
} as const;
export type GpaOrderTagEnumValues = (typeof GpaOrderTagEnum)[keyof typeof GpaOrderTagEnum];

export interface IMarqetaProcessKyc extends IMarqetaUserToken { }

enum IMarqetaCardState {
  ACTIVE = 'ACTIVE',
  LIMITED = 'LIMITED',
  SUSPENDED = 'SUSPENDED',
  TERMINATED = 'TERMINATED',
}

export interface IMarqetaCardTransition {
  cardToken: string;
  channel: string;
  state: IMarqetaCardState;
  reasonCode: string;
}

enum kyc_required {
  ALWAYS = 'ALWAYS',
  CONDITIONAL = 'CONDITIONAL',
  NEVER = 'NEVER',
}

export enum IMarqetaKycState {
  failure = 'failure',
  success = 'success',
  pending = 'pending',
}

interface IMarqetaACHGroupConfig {
  isReloadable: boolean;
  kycRequired: kyc_required;
}

export interface IMarqetaACHGroup {
  name: string;
  config: IMarqetaACHGroupConfig;
}

export interface IMarqetaClientAccessToken {
  cardToken: string;
  applicationToken: string;
}

export interface IMarqetaACHPlaidFundingSource {
  userToken: any;
  partnerAccountLinkReferenceToken: string;
  partner: string;
}

export enum IMarqetaACHTransferType {
  PUSH = 'PUSH',
  PULL = 'PULL',
}

export interface IMarqetaACHBankTransfer {
  amount: string;
  type: IMarqetaACHTransferType;
  fundingSourceToken: string;
}

export interface IMarqetaACHBankTransferTransition {
  bankTransferToken: string;
  status: string;
  channel: string;
}

export enum ControlTokenType {
  set_pin = 'SET_PIN',
  reveal_pin = 'REVEAL_PIN',
}

export enum CardholderVerificationMethod {
  biometric_face = 'BIOMETRIC_FACE',
  biometric_fingerprint = 'BIOMETRIC_FINGERPRINT',
  exp_cvv = 'EXP_CVV',
  login = 'LOGIN',
  otp = 'OTP',
  otp_cvv = 'OTP_CVV',
  other = 'OTHER',
}
export interface IMarqetaPinControlToken {
  cardToken: string;
  controlTokenType?: ControlTokenType;
}

export interface IMarqetaCreatePin {
  controlToken?: string;
  cardToken?: string;
  pin?: number;
  controlTokenType?: ControlTokenType;
}

export interface IMarqetaRevealPin {
  cardholderVerificationMethod: CardholderVerificationMethod;
  controlToken: string;
}

export interface IMarqetaMakeTransaction {
  cardToken: string;
  amount: number;
  mid: string;
}

export interface IMarqetaMakeTransactionAdvice {
  originalTransactionToken: string;
  amount: number;
}

export interface IMarqetaMakeTransactionClearing {
  originalTransactionToken: string;
  amount: number;
  isRefund: boolean;
}

export interface IACHTransition {
  token: string;
  bank_transfer_token: string;
  status: string;
  transaction_token: string;
  created_time: Date;
  last_modified_time: Date;
}

export interface IACHBankTransfer {
  token: string;
  amount: number;
  channel: string;
  funding_source_token: string;
  type: string;
  currency_code: string;
  transfer_speed: string;
  status: string;
  transitions: IACHTransition;
  created_time: Date;
  last_modified_time: Date;
}

export interface IACHFundingSource {
  token: string;
  accessToken?: string;
  account_suffix: string;
  verification_status: string;
  account_type: string;
  name_on_account: string;
  active: boolean;
  date_sent_for_verification: Date;
  partner: string;
  partner_account_link_reference_token?: string;
  is_default_account: boolean;
  verification_override: boolean;
  verification_notes: string;
  user_token: string;
  created_time?: Date;
  last_modified_time?: Date;
}

export interface IACHFundingSourceQuery {
  userId: ObjectId;
  fundingSourceToken?: string;
  userToken?: string;
  fromDate?: Date;
  toDate?: Date;
}

interface ILastModifiedTimeQuery {
  $gte: Date;
  $lt: Date;
}

export interface IACHFundingSourceModelQuery {
  userId: ObjectId;
  token?: string;
  user_token?: string;
  active: boolean;
  last_modified_time?: ILastModifiedTimeQuery;
}

export enum IMACHTransferStatus {
  INITIATED = 'INITIATED',
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUBMITTED = 'SUBMITTED',
  RETURNED = 'RETURNED',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
  CANCELLED = 'CANCELLED',
}

export enum IACHTransferTypes {
  PUSH = 'PUSH',
  PULL = 'PULL',
}

export interface IACHBankTransferQuery {
  userId: ObjectId;
  bankTransferToken?: string;
  fundingSourceToken?: string;
  type: IACHTransferTypes;
  status: IMACHTransferStatus;
  fromDate?: Date;
  toDate?: Date;
}

export interface IACHBankTransferModelQuery {
  userId: ObjectId;
  token?: string;
  bankTransferToken?: string;
  fundingSourceToken?: string;
  type?: IACHTransferTypes;
  status?: IMACHTransferStatus;
  last_modified_time?: ILastModifiedTimeQuery;
}

export interface IACHTransferValidationQuery {
  userId: ObjectId;
  fundingSourceToken: string;
  type: IMarqetaACHTransferType;
  statusArray: IMACHTransferStatus[];
  fromDate: Date;
  toDate: Date;
  limit?: number;
  amount: number;
}

export interface IACHBankTransferRequestFields extends IMarqetaACHBankTransfer {
  userId: ObjectId;
}

export type CardModel = {
  created_time?: string;
  last_modified_time?: string;
  token: string;
  user_token?: string;
  card_product_token?: string;
  last_four?: string;
  pan?: string;
  expiration?: string;
  expiration_time?: string;
  barcode?: string;
  pin_is_set?: boolean;
  state?: string;
  state_reason?: string;
  fulfillment_status?: string;
  instrument_type?: string;
  expedite?: boolean;
  metadata?: Record<string, any>;
};

export type UserModel = {
  token: string;
  active?: boolean;
  first_name?: string;
  last_name?: string;
  email?: string;
  address1?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  birth_date?: string;
  uses_parent_account?: boolean;
  corporate_card_holder?: boolean;
  created_time?: string;
  last_modified_time?: string;
  metadata?: Record<string, any>;
  account_holder_group_token?: string;
  status?: string;
  identifications?: Identification[];
};

export const ACHTransferTransitionStatusEnum = {
  Pending: 'PENDING',
  Processing: 'PROCESSING',
  Submitted: 'SUBMITTED',
  Returned: 'RETURNED',
  Completed: 'COMPLETED',
  Cancelled: 'CANCELLED',
} as const;
export type ACHTransferTransitionStatusEnumValues =
  (typeof ACHTransferTransitionStatusEnum)[keyof typeof ACHTransferTransitionStatusEnum];

export const ACHTransferTransitionChannelEnum = {
  API: 'API',
  SYSTEM: 'SYSTEM',
} as const;
export type ACHTransferTransitionChannelEnumValues =
  (typeof ACHTransferTransitionChannelEnum)[keyof typeof ACHTransferTransitionChannelEnum];

export type ACHTransferTransition = {
  token: string;
  bank_transfer_token: string;
  status: ACHTransferTransitionStatusEnumValues;
  reason: string;
  channel: ACHTransferTransitionChannelEnumValues;
  created_time: string;
  last_modified_time: string;
};

export const ACHTransferTransitionTypeEnum = {
  Push: 'PUSH',
  Pull: 'PULL',
} as const;
export type ACHTransferTransitionTypeEnumValues =
  (typeof ACHTransferTransitionTypeEnum)[keyof typeof ACHTransferTransitionTypeEnum];

export const ACHTransferTransitionTransferSpeedEnum = {
  Standard: 'STANDARD',
  SameDay: 'SAME_DAY',
} as const;
export type ACHTransferTransitionTransferSpeedEnumValues =
  (typeof ACHTransferTransitionTransferSpeedEnum)[keyof typeof ACHTransferTransitionTransferSpeedEnum];

export type ACHTransferModel = {
  token: string;
  amount: number;
  memo?: string;
  funding_source_token: string;
  type: ACHTransferTransitionTypeEnumValues;
  currency_code: string;
  transfer_speed: ACHTransferTransitionTransferSpeedEnumValues;
  statement_descriptor: string;
  standard_entry_class_code: string;
  status: IMACHTransferStatus;
  transitions: ACHTransferTransition[];
  created_time: string;
  last_modified_time: string;
};

export const DirectDepositStateEnum = {
  Pending: 'PENDING',
  Applied: 'APPLIED',
  Reversed: 'REVERSED',
  Rejected: 'REJECTED',
} as const;
export type DirectDepositStateEnumValues = (typeof DirectDepositStateEnum)[keyof typeof DirectDepositStateEnum];

export const DirectDepositTypeEnum = {
  Credit: 'CREDIT',
  Debit: 'DEBIT',
} as const;
export type DirectDepositTypeEnumValues = (typeof DirectDepositTypeEnum)[keyof typeof DirectDepositTypeEnum];

export type DirectDepositModel = {
  token: string;
  amount: number;
  type: DirectDepositTypeEnumValues;
  state: DirectDepositStateEnumValues;
  settlement_date: string;
  state_reason: string;
  state_reason_code: string;
  direct_deposit_account_token: string;
  user_token?: string;
  business_token?: string;
  standard_entry_class_code: string;
  company_name: string;
  company_discretionary_data: string;
  company_identification: string;
  company_entry_description: string;
  individual_identification_number: string;
  individual_name: string;
  created_time: string;
  last_modified_time: string;
};

export type WebhookCustomHeader = {
  [key: string]: string;
};

export type WebhookModel = {
  active?: boolean;
  config: {
    basic_auth_password: string;
    basic_auth_username: string;
    custom_header?: WebhookCustomHeader;
    secret?: string;
    url: string;
    use_mtls?: boolean;
  };
  events: string[];
  name: string;
  token?: string;
};

export type WebhookWithModifiedAndCreatedDates = WebhookModel & {
  created_time?: string;
  last_modified_time?: string;
};

export type WebhookPingModel = {
  token: string;
  payload: string;
};

export type WebhookPingRequest = {
  pings: WebhookPingModel[];
};

export const WebhookEventTypeEnum = {
  ChargebackTransition: 'chargebacktransition',
  DigitalWalletTokenTransition: 'digitalwallettokentransition',
  CardTransition: 'cardtransition',
  UserTransition: 'usertransition',
  BusinessTransition: 'businesstransition',
  Transaction: 'transaction',
} as const;
export type WebhookEventTypeEnumValues = (typeof WebhookEventTypeEnum)[keyof typeof WebhookEventTypeEnum];

export type ChargebackTransition = {
  token: string;
  state: ChargebackResponseStateEnumValues;
  previous_state: ChargebackResponseStateEnumValues;
  channel: ChargebackResponseChannelEnumValues;
  chargeback_token: string;
  reason: string;
  transaction_token: string;
  created_time: Date;
  last_modified_time: Date;
  type: ChargebackTypeEnumValues;
};

export type PaginatedMarqetaResponse<DataType> = {
  count: number;
  start_index: number;
  end_index: number;
  is_more: boolean;
  data: DataType;
};

export type ListUsersResponse = PaginatedMarqetaResponse<UserModel[]>;
export type GetUserByEmailResponse = PaginatedMarqetaResponse<UserModel[]>;
export type ListCardsResponse = { cards: PaginatedMarqetaResponse<CardModel[]> };
export type ListTransactionsResponse = { data: PaginatedMarqetaResponse<TransactionModel[]> };
export type ListACHFundingSourcesForUserResponse = { data: PaginatedMarqetaResponse<IACHFundingSource[]> };
export type ListACHBankTransfersResponse = { data: PaginatedMarqetaResponse<ACHTransferModel[]> };
export type ListWebhooksResponse = { data: PaginatedMarqetaResponse<WebhookWithModifiedAndCreatedDates[]> };
export type EnrichedMarqetaTransaction = Transaction & { marqeta_transaction: TransactionModel };
