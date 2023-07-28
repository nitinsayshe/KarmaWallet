interface Identification {
  type: string;
  value: string;
}

interface Metadata {
  notification_email: string;
  notification_language: string;
  authentication_question1: string;
  authentication_question2: string;
  authentication_question3: string;
  authentication_answer1: string;
  authentication_answer2: string;
  authentication_answer3: string;
}

export interface IMarqetaUserToken {
  user_token:string;
}

export interface IMarqetaCreateUser {
  first_name: string;
  last_name: string;
  token?: any;
  email: string;
  identifications: Identification[];
  birth_date: string;
  address1: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  phone: string;
  gender: string;
  uses_parent_account: boolean;
  metadata: Metadata;
}

export interface IMarqetaUserTransition extends IMarqetaUserToken{
  channel:string;
  reason:string;
  reason_code:string;
  status:string;
}

export interface IMarqetaCreateCard extends IMarqetaUserToken {
  card_product_token: string;
}

export interface IMarqetaCreateGPAorder extends IMarqetaUserToken {
  amount: number;
  fees: number;
  currency_code:string;
  funding_source_token:string;
}

export interface IMarqetaProcessKyc extends IMarqetaUserToken {
}

export interface IMarqetaCardTransition {
  card_token: string;
  channel:string;
  state:string;
}

enum kyc_required {
  ALWAYS = 'ALWAYS',
  CONDITIONAL = 'CONDITIONAL',
  NEVER = 'NEVER'
}

interface IMarqetaACHGroupConfig{
  is_reloadable:boolean;
  kyc_required:kyc_required;
}

export interface IMarqetaACHGroup{
  name: string;
  config: IMarqetaACHGroupConfig;
}

export interface IMarqetaClientAccessToken{
  card_token: string;
  application_token: string;
}

export interface IMarqetaACHPlaidFundingSource{
  user_token: any;
  partner_account_link_reference_token: string;
  partner:string;
}

export enum ControlTokenType {
  set_pin = 'SET_PIN',
  reveal_pin = 'REVEAL_PIN',
}

export enum CardholderVerificationMethod {
  biometric_face = 'BIOMETRIC_FACE',
  biometric_fingerprint = 'BIOMETRIC_FINGERPRINT',
  exp_cvv ='EXP_CVV',
  login= 'LOGIN',
  otp='OTP',
  otp_cvv='OTP_CVV',
  other='OTHER'
}
export interface IMarqetaPinControlToken{
  cardToken:string;
  controlTokenType?:ControlTokenType;
}

export interface IMarqetaCreatePin{
  cardToken:string;
  pinNumber:Number;
  controlTokenType?:ControlTokenType;
}

export interface IMarqetaRevealPin{
  cardholder_verification_method:CardholderVerificationMethod;
  control_token:string;
}
