import { IMarqetaKycState } from '../../../integrations/marqeta/types';

export enum IMarqetaUserState {
  active = 'ACTIVE',
  unverified = 'UNVERIFIED',
  limited = 'LIMITED'
}

enum ResponseMessages {
  APPROVED = 'Your Karma Wallet card will be mailed to your address within 5-7 business days.',
  NAME_ISSUE = 'Your application is pending due to an invalid or mismatched name.',
  ADDRESS_ISSUE = 'Your application is pending due to a missing, invalid, or mismatched address or a PO Box issue. (PO Boxes are not a valid address for validation purposes)',
  DATE_OF_BIRTH_ISSUE = 'Your application is pending due to an invalid or mismatched date of birth.',
  SSN_ISSUE = 'Your application is pending due to a missing, invalid or mismatched Social Security Number (SSN).',
  DECLINED = 'Your application has been declined.'
}

enum SolutionMessages {
  NAME_OR_DOB_ISSUE = 'Please submit one of the following unexpired government-issued photo identification items that shows name and date of birth to support@karmawallet.io',
  SSN_ISSUE = 'Please submit a photo of the following items to support@karmawallet.io',
  ADDRESS_ISSUE = 'Please submit one of the following documents that shows your full name and address to support@karmawallet.io',
  CONTACT_SUPPORT = 'This outcome requires a manual review by Karma Wallet to determine the next appropriate step. Contact support@karmawallet.io.',
  ALREADY_REGISTERED = 'You already have a Karma Wallet card. We currently only allow one Karma card per account.',
}

const AcceptedDocuments = {
  NAME_OR_DOB_ISSUE: ['Driver’s license or state-issued identification card',
    'Passport or US passport card'],
  ADDRESS_ISSUE: [
    'Unexpired state-issued driver’s license or identification card',
    'US Military Identification Card',
    'Utility bill',
    'Bank statement',
    'Current rental or lease agreement',
    'Mortgage statement'],
  DateOfBirthIssue: [
    'Driver’s license or state-issued identification card',
    'Passport or US passport card'],
  SSN_ISSUE: [
    'Social Security card',
    'Recent W-2 or 1099 showing nine-digit SSN, full name, and address.',
    'ITIN card or document showing ITIN approval'],
};

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
  Already_Registered = 'Already_Registered'
}

interface TransformedResponse {
  message: string;
  status: IMarqetaKycState;
  reason?: ReasonCode;
  acceptedDocuments?: string[];
  solutionText?: string;
  authkey?: string;
}

interface SourceResponse {
  userToken: string;
  email: string;
  kycResult: {
    status: string;
    codes: ReasonCode;
  };
}

export const getShareableMarqetaUser = (sourceResponse: SourceResponse): TransformedResponse => {
  const { kycResult } = sourceResponse;
  const messages: Record<ReasonCode, string> = {
    [ReasonCode.Approved]: ResponseMessages.APPROVED,
    [ReasonCode.NameIssue]: ResponseMessages.NAME_ISSUE,
    [ReasonCode.AddressIssue]: ResponseMessages.ADDRESS_ISSUE,
    [ReasonCode.DateOfBirthIssue]: ResponseMessages.DATE_OF_BIRTH_ISSUE,
    [ReasonCode.SSNIssue]: ResponseMessages.SSN_ISSUE,
    [ReasonCode.RiskIssue]: ResponseMessages.DECLINED,
    [ReasonCode.NoRecordFound]: ResponseMessages.DECLINED,
    [ReasonCode.Denied_KYC]: ResponseMessages.DECLINED,
    [ReasonCode.OFACFailure]: ResponseMessages.DECLINED,
    [ReasonCode.Already_Registered]: ResponseMessages.DECLINED,
  };

  const solutionText: Record<ReasonCode, string> = {
    [ReasonCode.Approved]: null,
    [ReasonCode.NameIssue]: SolutionMessages.NAME_OR_DOB_ISSUE,
    [ReasonCode.AddressIssue]: SolutionMessages.ADDRESS_ISSUE,
    [ReasonCode.DateOfBirthIssue]: SolutionMessages.NAME_OR_DOB_ISSUE,
    [ReasonCode.SSNIssue]: SolutionMessages.SSN_ISSUE,
    [ReasonCode.RiskIssue]: SolutionMessages.CONTACT_SUPPORT,
    [ReasonCode.NoRecordFound]: SolutionMessages.CONTACT_SUPPORT,
    [ReasonCode.Denied_KYC]: SolutionMessages.CONTACT_SUPPORT,
    [ReasonCode.OFACFailure]: SolutionMessages.CONTACT_SUPPORT,
    [ReasonCode.Already_Registered]: SolutionMessages.ALREADY_REGISTERED,
  };

  const acceptedDocuments: Record<ReasonCode, string[]> = {
    [ReasonCode.Approved]: null,
    [ReasonCode.NameIssue]: AcceptedDocuments.NAME_OR_DOB_ISSUE,
    [ReasonCode.AddressIssue]: AcceptedDocuments.ADDRESS_ISSUE,
    [ReasonCode.DateOfBirthIssue]: AcceptedDocuments.NAME_OR_DOB_ISSUE,
    [ReasonCode.SSNIssue]: AcceptedDocuments.SSN_ISSUE,
    [ReasonCode.RiskIssue]: null,
    [ReasonCode.NoRecordFound]: null,
    [ReasonCode.Denied_KYC]: null,
    [ReasonCode.OFACFailure]: null,
    [ReasonCode.Already_Registered]: null,
  };

  const transformed: TransformedResponse = {
    status: kycResult.status as IMarqetaKycState,
    reason: kycResult.codes[0] as ReasonCode,
    message: messages[kycResult.codes[0] as ReasonCode],
  };
  if (solutionText[kycResult.codes[0] as ReasonCode]) transformed.solutionText = solutionText[kycResult.codes[0] as ReasonCode];
  if (acceptedDocuments[kycResult.codes[0] as ReasonCode]) transformed.acceptedDocuments = acceptedDocuments[kycResult.codes[0] as ReasonCode];
  return transformed;
};
