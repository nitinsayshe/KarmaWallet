import { FilterQuery, Types } from 'mongoose';
import { IMarqetaUserIntegrations } from '../../../integrations/marqeta/user/types';
import { IPersonaIntegration } from '../../../integrations/persona/types';
import { ICheckoutSessionInfo } from '../../../integrations/stripe/types';
import { IKarmaCardApplicationDocument } from '../../../models/karmaCardApplication/types';

export type KarmaCardApplicationIterationRequest<FieldsType> = {
  batchQuery: FilterQuery<IKarmaCardApplicationDocument>;
  batchLimit: number;
  fields?: FieldsType;
};

export type KarmaCardApplicationIterationResponse<FieldsType> = {
  applicationId: Types.ObjectId;
  fields?: FieldsType;
};

export interface ICreateKarmaCardApplicantData {
  firstName: string;
  lastName: string;
  email: string;
  ssn: string;
  birthDate: string;
  phone: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

export enum ReasonCode {
  AddressIssue = 'AddressIssue',
  DateOfBirthIssue = 'DateOfBirthIssue',
  NameIssue = 'NameIssue',
  SSNIssue = 'SSNIssue',
  NoRecordFound = 'NoRecordFound',
  RiskIssue = 'RiskIssue',
  Denied_KYC = 'Denied KYC',
  OFACFailure = 'OFACFailure',
  Approved = 'Approved',
  Already_Registered = 'Already_Registered',
  FailedInternalKyc = 'FailedInternalKyc',
}

export enum ShareASaleXType {
  FREE = 'FREE',
}

export interface PuppateerShareASaleParams {
  sscid: string;
  trackingid: string;
  xtype: string;
  sscidCreatedOn: string;
}

export const ApplicationDecisionStatus = {
  failure: 'failure',
  success: 'success',
  pending: 'pending',
} as const;
export type ApplicationDecisionStatusValues = (typeof ApplicationDecisionStatus)[keyof typeof ApplicationDecisionStatus];

export interface TransformedResponse {
  status: ApplicationDecisionStatusValues;
  reason?: ReasonCode;
  internalKycTemplateId?: string;
  authkey?: string;
  paymentData?: ICheckoutSessionInfo;
}

export interface IApplicationDecision {
  marqeta?: Partial<IMarqetaUserIntegrations>;
  persona?: IPersonaIntegration
  internalKycTemplateId?: string;
  paymentLink?: string;
  paymentData?: ICheckoutSessionInfo;
  paidMembership?: boolean;
}
