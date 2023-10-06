import { ObjectId } from 'mongoose';
import { Transaction } from 'plaid';
import { TransactionModel } from '../../clients/marqeta/types';

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

export interface IMarqetaCreateGPAorder extends IMarqetaUserToken {
  amount: number;
  fees: number;
  currencyCode: string;
  fundingSourceToken: string;
}

export interface IMarqetaProcessKyc extends IMarqetaUserToken {}

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
  fundingSourceToken: string;
  type: IMarqetaACHTransferType;
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
  $gte : Date;
  $lt : Date;
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
  CANCELLED = 'CANCELLED'
}

export enum IACHTransferTypes {
  PUSH = 'PUSH',
  PULL = 'PULL'
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
  type? : IACHTransferTypes;
  status?: IMACHTransferStatus;
  last_modified_time?: ILastModifiedTimeQuery;
}

export interface IACHTransferValidationQuery {
  userId: ObjectId;
  fundingSourceToken: string;
  type: IMarqetaACHTransferType;
  statusArray: IMACHTransferStatus[];
  fromDate: Date;
  toDate : Date;
  limit?: number;
  amount: number;
}

export interface IACHBankTransferRequestFields extends IMarqetaACHBankTransfer {
  userId : ObjectId;
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

export type EnrichedMarqetaTransaction = Transaction & { marqeta_transaction: TransactionModel };
