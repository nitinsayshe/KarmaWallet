import { IMarqetaKycState } from '../../../integrations/marqeta/types';

enum ReasonCode {
  AddressIssue = 'AddressIssue',
  DateOfBirthIssue = 'DateOfBirthIssue',
  NameIssue = 'NameIssue',
  SSNIssue = 'SSNIssue',
  NoRecordFound = 'NoRecordFound',
  RiskIssue = 'RiskIssue',
  Denied_KYC = 'Denied KYC',
  OFACFailure = 'OFACFailure',
  Approved = 'Approved'
}

interface TransformedResponse {
  message: string;
  status: IMarqetaKycState;
  reason?: ReasonCode;
  acceptedDocuments?: string[];
  solutionText?: string;
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
    [ReasonCode.Approved]: 'Your Karma Wallet card should arrive in 3-5 business days.',
    [ReasonCode.NameIssue]: 'Your application is pending due to an invalid or mismatched name.',
    [ReasonCode.AddressIssue]: 'Your application is pending due to a missing, invalid, or mismatched address or a PO Box issue. (PO Boxes are not a valid address for validation purposes)',
    [ReasonCode.DateOfBirthIssue]: 'Your application is pending due to an invalid or mismatched date of birth.',
    [ReasonCode.SSNIssue]: 'Your application is pending due to a missing, invalid or mismatched Social Security Number (SSN).',
    [ReasonCode.RiskIssue]: 'Your application has been declined.',
    [ReasonCode.NoRecordFound]: 'Your application has been declined.',
    [ReasonCode.Denied_KYC]: 'Your application has been declined.',
    [ReasonCode.OFACFailure]: 'Your application has been declined.',
  };

  const solutionText: Record<ReasonCode, string> = {
    [ReasonCode.Approved]: null,
    [ReasonCode.NameIssue]: 'Please submit one of the following unexpired government-issued photo identification items that shows name and date of birth to support@karmawallet.io',
    [ReasonCode.AddressIssue]: 'Please submit one of the following documents that shows your full name and address to (insert email here?)',
    [ReasonCode.DateOfBirthIssue]: 'Please submit one of the following unexpired government-issued photo identification items that shows name and date of birth to support@karmawallet.io',
    [ReasonCode.SSNIssue]: 'Please submit a photo of of of the following items to support@karmawallet.io',
    [ReasonCode.RiskIssue]: 'This outcome requires a manual review by Karma Wallet to determine the next appropriate step. Contact support@karmawallet.io.',
    [ReasonCode.NoRecordFound]: 'This outcome requires a manual review by Karma Wallet to determine the next appropriate step. Contact support@karmawallet.io.',
    [ReasonCode.Denied_KYC]: 'This outcome requires a manual review by Karma Wallet to determine the next appropriate step. Contact support@karmawallet.io.',
    [ReasonCode.OFACFailure]: 'This outcome requires a manual review by Karma Wallet to determine the next appropriate step. Contact support@karmawallet.io.',
  };

  const acceptedDocuments: Record<ReasonCode, string[]> = {
    [ReasonCode.Approved]: null,
    [ReasonCode.NameIssue]: [
      '- Driver’s license or state-issued identification card',
      '- Passport or US passport card'],
    [ReasonCode.AddressIssue]: [
      '- Unexpired state-issued driver’s license or identification card',
      '- US Military Identification Card',
      '- Utility bill',
      '- Bank statement',
      '- Current rental or lease agreement',
      '- Mortgage statement'],
    [ReasonCode.DateOfBirthIssue]: [
      '- Driver’s license or state-issued identification card',
      '- Passport or US passport card'],
    [ReasonCode.SSNIssue]: [
      '- Social Security card',
      '- Recent W-2 or 1099 showing nine-digit SSN, full name, and address.',
      '- ITIN card or document showing ITIN approval'],
    [ReasonCode.RiskIssue]: null,
    [ReasonCode.NoRecordFound]: null,
    [ReasonCode.Denied_KYC]: null,
    [ReasonCode.OFACFailure]: null,
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
