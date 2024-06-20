export enum IMarqetaUserStatus {
  ACTIVE = 'ACTIVE',
  UNVERIFIED = 'UNVERIFIED',
  LIMITED = 'LIMITED',
  SUSPENDED = 'SUSPENDED',
  CLOSED = 'CLOSED',
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

export interface IMarqetaUserTransition {
  userToken: string;
  channel: string;
  reason: string;
  reasonCode: string;
  status: string;
}

export type NonClosedMarqetaUserStatus = Omit<IMarqetaUserStatus, 'CLOSED'>;

export interface IMarqetaUserToken {
  userToken: string;
}

interface Identification {
  type: string;
  value: string;
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

export interface IMarqetaProcessKyc {
  userToken: string;
}

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
  reason?: string;
  reason_code?: string;
}

export interface IMarqetaLookUp {
  email: string;
}
