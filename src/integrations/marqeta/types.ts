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
