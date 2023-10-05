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
  email: string
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

export interface IMarqetaProcessKyc extends IMarqetaUserToken {
}

enum IMarqetaCardState {
  ACTIVE = 'ACTIVE',
  LIMITED = 'LIMITED',
  SUSPENDED = 'SUSPENDED',
  TERMINATED = 'TERMINATED'
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
  NEVER = 'NEVER'
}

export enum IMarqetaKycState {
  failure = 'failure',
  success = 'success',
  pending = 'pending'
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
  other = 'OTHER'
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
