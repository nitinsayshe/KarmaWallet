import { ObjectId } from 'mongoose';
import { Transaction } from 'plaid';
import { ChargebackResponseChannelEnumValues, ChargebackResponseStateEnumValues, TransactionModel } from '../../clients/marqeta/types';
import { ChargebackTypeEnumValues } from '../../lib/constants';

interface Identification {
  type: string;
  value: string;
}

export enum IMarqetaUserStatus {
  ACTIVE = 'ACTIVE',
  UNVERIFIED = 'UNVERIFIED',
  LIMITED = 'LIMITED',
  SUSPENDED = 'SUSPENDED',
  CLOSED = 'CLOSED',
}

export interface IMarqetaUserToken {
  userToken: string;
}

export enum MarqetaCardState {
  UNACTIVATED = 'UNACTIVATED',
  ACTIVE = 'ACTIVE',
  LIMITED = 'LIMITED',
  SUSPENDED = 'SUSPENDED',
  TERMINATED = 'TERMINATED',
}

export interface IMarqetaCreateUser {
  firstName: string;
  lastName: string;
  token?: string;
  email: string;
  identifications: Identification[];
  birthDate: string;
  phone: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
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

export interface IMarqetaUnloadGPAOrder {
  amount: number;
  orderToken: string;
}

export interface IMarqetaLoadGpaFromProgramFundingSource {
  amount: number;
  userId: string;
  // this should be an optional note about the credit deposit
  memo?: string;
  // will come in as a string: `groupId=${groupId},type=${type}`, groupId is not required for cashback
  tags?: string;
}

export interface IMarqetaCreateGPAorder extends IMarqetaUserToken {
  tags?: string; // comma separated list of tags
  amount: number;
  fees?: number;
  currencyCode: string;
  fundingSourceToken: string;
  memo?: string;
}

export interface IMarqetaProcessKyc extends IMarqetaUserToken { }

export interface IMarqetaCardTransition {
  cardToken: string;
  channel: string;
  state: MarqetaCardState;
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

export type MarqetaCardModel = {
  barcode?: string;
  card_product_token?: string;
  created_time?: string;
  expedite?: boolean;
  expiration_time?: string;
  expiration?: string;
  fulfillment_status?: string;
  instrument_type?: string;
  last_four?: string;
  last_modified_time?: string;
  metadata?: Record<string, any>;
  pan?: string;
  pin_is_set?: boolean;
  state_reason?: string;
  state?: string;
  token: string;
  user_token?: string;
};

export enum MarqetaCardWebhookType {
  'DELIVERED' = 'fulfillment.delivered',
  'DIGITALLY_PRESENTED' = 'fulfillment.digitally_presented',
  'ISSUED' = 'fulfillment.issued',
  'ORDERED' = 'fulfillment.ordered',
  'REJECTED' = 'fulfillment.rejected',
  'SHIPPED' = 'fulfillment.shipped',
  'ACTIVATED' = 'state.activated',
  'LIMITED' = 'state.limited',
  'SUSPENDED' = 'state.suspended',
  'TERMINATED' = 'state.terminated',
  'REINSTATED' = 'state.reinstated',
}

export enum MarqetaCardFulfillmentStatus {
  'DELIVERED' = 'DELIVERED',
  'DIGITALLY_PRESENTED' = 'DIGITALLY_PRESENTED',
  'ISSUED' = 'ISSUED',
  'ORDERED' = 'ORDERED',
  'REJECTED' = 'REJECTED',
  'SHIPPED' = 'SHIPPED',
}

export interface IMarqetaWebhookCardsEvent {
  card_product_token: string;
  card_token: string;
  barcode?: string;
  instrument_type?: string;
  card: Object;
  channel: string;
  created_time: string;
  expiration_time: Date;
  expiration: string;
  fulfillment_status: MarqetaCardFulfillmentStatus;
  last_four: string;
  pan: string;
  pin_is_set: Boolean;
  reason: string;
  reason_code: string;
  state: MarqetaCardState;
  token: string;
  type: string;
  user_token: string;
  validations: Object;
}

export const IMarqetaReasonCodesEnum: { [key: string]: string } = {
  '00': 'Object activated for the first time.',
  '01': 'Requested by you.',
  '02': 'Inactivity over time.',
  '03': 'This address cannot accept mail or the addressee is unknown.',
  '04': 'Negative account balance.',
  '05': 'Account under review.',
  '06': 'Suspicious activity was identified.',
  '07': 'Activity outside the program parameters was identified.',
  '08': 'Confirmed fraud was identified.',
  '09': 'Matched with an Office of Foreign Assets Control list.',
  10: 'Card was reported lost.',
  11: 'Card information was cloned.',
  12: 'Account or card information was compromised.',
  13: 'Temporary status change while on hold/leave.',
  14: 'Initiated by Marqeta.',
  15: 'Initiated by issuer.',
  16: 'Card expired.',
  17: 'Failed KYC.',
  18: 'Changed to ACTIVE because information was properly validated.',
  19: 'Changed to ACTIVE because account activity was properly validated.',
  20: 'Change occurred prior to the normalization of reason codes.',
  21: 'Initiated by a third party, often a digital wallet provider.',
  22: 'PIN retry limit reached.',
  23: 'Card was reported stolen.',
  24: 'Address issue.',
  25: 'Name issue.',
  26: 'SSN issue.',
  27: 'DOB issue.',
  28: 'Email issue.',
  29: 'Phone issue.',
  30: 'Account/fulfillment mismatch.',
  31: 'Other reason.',
};

export type MarqetaUserModel = {
  token: string;
  active?: boolean;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  email?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  birth_date?: string;
  phone?: string;
  uses_parent_account?: boolean;
  corporate_card_holder?: boolean;
  created_time?: Date;
  last_modified_time?: Date;
  metadata?: Record<string, any>;
  account_holder_group_token?: string;
  status?: IMarqetaUserStatus;
  identifications?: Identification[];
};

export interface IMarqetaKycResult {
  status: IMarqetaKycState;
  codes: string[];
}

interface IMarqetaIdentification {
  type: string,
  value: string,
}

export interface IMarqetaUserIntegrations {
  userToken: string;
  email?: string;
  kycResult?: IMarqetaKycResult;
  first_name?: string;
  last_name?: string;
  birth_date?: string;
  phone?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  account_holder_group_token?: string;
  identifications?: IMarqetaIdentification[];
  status?: IMarqetaUserStatus;
  created_time?: string;
  _id?: string;
  reason? :string;
  reason_code? :string;
}

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

export interface IMarqetaCardActionEvent {
  card_token: string;
  created_time: Date;
  state: string;
  token: string;
  type: string;
  user_token: string;
}

export enum MarqetaUserTransitionReasonCode {
  // object activated for first time
  'firstTimeActivation' = '00',
  // request by you
  'requestedByYou' = '01',
  // inactivity over time
  'inactivity' = '02',
  // This address cannot accept mail or the addressee is unknown.
  'addressUnknown' = '03',
  // Negative account balance
  'negativeBalance' = '04',
  // Account under review
  'accountUnderReview' = '05',
  // Suspicious activity identified
  'suspiciousActivity' = '06',
  // Activity outside of program parameters identified
  'activityOutsideProgram' = '07',
  // Confirmed fraud was identified
  'confirmedFraud' = '08',
  // Matched with an Office of Foreign Assets Control list
  'matchedOFAC' = '09',
  // Card was reported lost
  'cardReportedLost' = '10',
  // Card information was cloned
  'cardInfoCloned' = '11',
  // Account or card information was compromised
  'infoCompromised' = '12',
  // Temporary status change while on hold/leave
  'temporaryHold' = '13',
  // Initiated by Marqeta
  'initiatedByMarqeta' = '14',
  // Initiated by issuerrea
  'initiatedByIssuer' = '15',
  // cardExpired
  'cardExpired' = '16',
  // failedKYC
  'failedKYC' = '17',
  // Changed to ACTIVE because information was properly validated.
  'changedToActiveInfoValid' = '18',
  // Changed to ACTIVE because account activity was properly validated
  'changedToActiveActivityValid' = '19',
  //  Change occurred prior to the normalization of reason codes.
  'changeOccurredPriorToNormalization' = '20',
  // Initiated by a third party, often a digital wallet provider.
  'initiatedByThirdParty' = '21',
  // Pin retry limit reached
  'pinRetryLimitReached' = '22',
  // Card was reported stolen
  'cardReportedStolen' = '23',
  // address issue
  'addressIssue' = '24',
  // name issue
  'nameIssue' = '25',
  // ssn issue
  'ssnIssue' = '26',
  // dob issue
  'dobIssue' = '27',
  // email issue
  'emailIssue' = '28',
  // phone issue
  'phoneIssue' = '29',
  // account fullfillment mismatch
  'accountFulfillmentMismatch' = '30',
  // other reason
  'other' = '31',
}

export const NACHAACHReturnCodesEnum = {
  R01: 'Insufficient Funds',
  R02: 'Account Closed',
  R03: 'No Account/Unable to Locate Account',
  R04: 'Invalid Account Number',
  R05: 'Improper Debit to Consumer Account',
  R06: 'Returned per ODFI Request',
  R07: 'Authorization Revoked by Customer',
  R08: 'Payment Stopped',
  R09: 'Uncollected Funds',
  R10: 'Customer Advises Originator is Not Known to Receiver and/or Originator is Not Authorized by Receiver to Debit Receiver’s Account',
  R11: 'Customer Advises Entry Not in Accordance with the Terms of the Authorization',
  R12: 'Branch Sold to Another DFI',
  R13: 'RDFI Not Qualified to Participate',
  R14: 'Representative Payee Deceased or Unable to Continue in that Capacity',
  R15: 'Beneficiary or Account Holder Deceased',
  R16: 'Bank Account Frozen',
  R17: 'File Record Edit Criteria',
  R18: 'Improper Effective Entry Date',
  R19: 'Amount Field Error',
  R20: 'Non-Transaction Account',
  R21: 'Invalid Company Identification',
  R22: 'Invalid Individual ID Number',
  R23: 'Credit Entry Refused by Receiver',
  R24: 'Duplicate Entry',
  R25: 'Addenda Error',
  R26: 'Mandatory Field Error',
  R27: 'Trace Number Error',
  R28: 'Routing Number Check Digit Error',
  R29: 'Corporate Customer Advises Not Authorized',
  R30: 'RDFI Not Participant in Check Truncation Program',
  R31: 'Permissible Return Entry',
  R32: 'RDFI Non-Settlement',
  R33: 'Return of XCK Entry',
  R34: 'Limited Participation DFI',
  R35: 'Return of Improper Debit Entry',
  R36: 'Return of Improper Credit Entry',
  R37: 'Source Document Presented for Payment',
  R38: 'Stop Payment on Source Document',
  R39: 'Improper Source Document',
} as const;
export type NACHAACHReturnCodeEnumValues = (typeof NACHAACHReturnCodesEnum)[keyof typeof NACHAACHReturnCodesEnum];

export interface IMarqetaUserTransitionsEvent {
  token: string;
  status: IMarqetaUserStatus;
  reason?: string;
  reason_code: string;
  channel: string;
  created_time: Date;
  last_modified_time: Date;
  user_token: string;
  metadata: Object;
}

export interface IMarqetaBankTransferTransitionEvent {
  token: string;
  bank_transfer_token: string;
  status: string;
  return_reason: string;
  return_code: NACHAACHReturnCodeEnumValues;
  channel: string;
  created_time: Date;
  last_modified_time: Date;
}

export interface IMarqetaWebhookBody {
  cards: IMarqetaWebhookCardsEvent[];
  cardactions: IMarqetaCardActionEvent[];
  chargebacktransitions: ChargebackTransition[];
  usertransitions: IMarqetaUserTransitionsEvent[];
  banktransfertransitions: IMarqetaBankTransferTransitionEvent[];
  transactions: TransactionModel[];
  cardtransitions: IMarqetaWebhookCardsEvent[];
}

export interface IMarqetaWebhookHeader {
  authorization: string;
}

export enum MarqetaWebhookConstants {
  PIN_SET = 'pin.set',
  COMPLETED = 'COMPLETED',
  AUTHORIZATION = 'authorization',
  AUTHORIZATION_CLEARING = 'authorization.clearing',
  GPA_CREDIT = 'gpa.credit',
  PIN_DEBIT = 'pindebit',
  COMPLETION = 'COMPLETION',
}

export enum MarqetaBankTransitionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUBMITTED = 'SUBMITTED',
  COMPLETED = 'COMPLETED',
  RETURNED = 'RETURNED',
  CANCELLED = 'CANCELLED',
  ERROR = 'ERROR',
}

export const MCCStandards = {
  DINING: ['5812', '5814'],
  GAS: ['5542'],
};

export const InsufficientFundsConstants = {
  CODES: ['1016', '1865', '1923'],
};

export interface IGPABalanceResponseData {
  currency_code: string;
  ledger_balance: number;
  available_balance: number;
  credit_balance: number;
  pending_credits: number;
}

export interface IGPABalanceResponse {
  gpa: IGPABalanceResponseData;
}

export type ListUsersResponse = PaginatedMarqetaResponse<MarqetaUserModel[]>;
export type GetUserByEmailResponse = PaginatedMarqetaResponse<MarqetaUserModel[]>;
export type ListCardsResponse = { cards: PaginatedMarqetaResponse<MarqetaCardModel[]> };
export type ListTransactionsResponse = { data: PaginatedMarqetaResponse<TransactionModel[]> };
export type ListACHFundingSourcesForUserResponse = { data: PaginatedMarqetaResponse<IACHFundingSource[]> };
export type ListACHBankTransfersResponse = { data: PaginatedMarqetaResponse<ACHTransferModel[]> };
export type ListWebhooksResponse = { data: PaginatedMarqetaResponse<WebhookWithModifiedAndCreatedDates[]> };
export type EnrichedMarqetaTransaction = Transaction & { marqeta_transaction: TransactionModel };
