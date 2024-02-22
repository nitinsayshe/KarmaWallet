import { IMarqetaKycState } from '../../../integrations/marqeta/types';
import { CardStatus } from '../../../lib/constants';
import { CardModel } from '../../../models/card';
import { IUserDocument } from '../../../models/user';

enum ResponseMessages {
  APPROVED = 'Your Karma Wallet Card will be mailed to your address within 5-7 business days.',
  NAME_ISSUE = 'Your application is pending due to an invalid or mismatched name.',
  ADDRESS_ISSUE = 'Your application is pending due to a missing, invalid, or mismatched address or a PO Box issue. (PO Boxes are not a valid address for validation purposes)',
  DATE_OF_BIRTH_ISSUE = 'Your application is pending due to an invalid or mismatched date of birth.',
  SSN_ISSUE = 'Your application is pending due to a missing, invalid or mismatched Social Security Number (SSN).',
  DECLINED = 'Your application has been declined.',
}

export enum SolutionMessages {
  NAME_OR_DOB_ISSUE = 'Please submit one of the following unexpired government-issued photo identification items that shows name and date of birth to support@karmawallet.io',
  SSN_ISSUE = 'Please submit a photo of the following items to support@karmawallet.io',
  ADDRESS_ISSUE = 'Please submit two of the following documents that show your full name and address to support@karmawallet.io',
  CONTACT_SUPPORT = 'This outcome requires a manual review by Karma Wallet to determine the next appropriate step. Contact support@karmawallet.io.',
  ALREADY_REGISTERED = 'You already have a Karma Wallet Card. We currently only allow one Karma Wallet Card per account.',
  FAILED_INTERNAL_KYC = 'Your application is pending, please submit two forms of the following identification to support@karmawallet.io.',
}

export const AcceptedDocuments = {
  NAME_OR_DOB_ISSUE: [
    'Unexpired government issued photo ID that has name and date of birth',
    'Driver’s License or State Issued ID',
    'Passport or US passport card',
  ],
  ADDRESS_ISSUE: [
    'Unexpired state-issued driver’s license or identification card',
    'US Military Identification Card',
    'Utility bill (within past 60 days)',
    'Bank statement (within past 60 days)',
    'Current rental or lease agreement',
    'Mortgage statement (within 6 months)',
  ],
  DateOfBirthIssue: ['Driver’s license or state-issued identification card', 'Passport or US passport card'],
  FAILED_INTERNAL_KYC: [
    "Driver's License or State Issued ID",
    'Passport',
    'Bank or Credit Card Statement: within 60 days',
    'Utility Bill: within 60 days',
    'Mortgage Statement: within 6 months',
    'Lease Statement with current address',
  ],
  SSN_ISSUE: [
    'Social Security Card',
    'Recent W-2 or 1099 showing nine-digit SSN, full name, and address.',
    'ITIN card or document showing ITIN approval',
  ],
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
  Already_Registered = 'Already_Registered',
  FailedInternalKyc = 'FailedInternalKyc',
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
    [ReasonCode.FailedInternalKyc]: ResponseMessages.DECLINED,
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
    [ReasonCode.FailedInternalKyc]: SolutionMessages.FAILED_INTERNAL_KYC,
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
    [ReasonCode.FailedInternalKyc]: AcceptedDocuments.FAILED_INTERNAL_KYC,
    [ReasonCode.OFACFailure]: null,
    [ReasonCode.Already_Registered]: null,
  };

  const transformed: TransformedResponse = {
    status: (kycResult?.status as IMarqetaKycState) || IMarqetaKycState.failure,
    reason: kycResult.codes[0] as ReasonCode,
    message: messages[kycResult.codes[0] as ReasonCode],
  };

  if (solutionText[kycResult.codes[0] as ReasonCode]) transformed.solutionText = solutionText[kycResult.codes[0] as ReasonCode];
  if (acceptedDocuments[kycResult.codes[0] as ReasonCode]) transformed.acceptedDocuments = acceptedDocuments[kycResult.codes[0] as ReasonCode];

  return transformed;
};

export const hasKarmaWalletCards = async (userObject: IUserDocument) => {
  const karmaCards = await CardModel.find({
    userId: userObject._id.toString(),
    'integrations.marqeta': { $exists: true },
    status: { $nin: [CardStatus.Removed] },
  });
  return !!karmaCards.length;
};

// get a breakdown a user's Karma Wallet cards
export const karmaWalletCardBreakdown = async (userObject: IUserDocument) => {
  const karmaCards = await CardModel.find({
    userId: userObject._id.toString(),
    'integrations.marqeta': { $exists: true },
    status: { $nin: [CardStatus.Removed] },
  });

  console.log('///// check cards exist', karmaCards.length, karmaCards);

  const virtualCard = karmaCards.filter((card) => card.integrations.marqeta?.card_product_token.includes('kw_virt'));
  const physicalCard = karmaCards.filter((card) => card.integrations.marqeta?.card_product_token.includes('kw_phys'));

  return {
    virtualCards: virtualCard.length,
    physicalCard: physicalCard.length,
  };
};

export const hasPhysicalCard = async (userObject: IUserDocument) => {
  const karmaCards = await CardModel.find({
    userId: userObject._id.toString(),
    'integrations.marqeta.': { $exists: true },
    status: { $nin: [CardStatus.Removed] },
  });

  if (!!karmaCards.length) {
    const physicalCard = karmaCards.find((card) => card.integrations.marqeta?.card_product_token.includes('kw_phys'));
    return !!physicalCard;
  }
  return false;
};

export const hasVirtualCard = async (userObject: IUserDocument) => {
  const karmaCards = await CardModel.find({
    userId: userObject._id.toString(),
    'integrations.marqeta.': { $exists: true },
    status: { $nin: [CardStatus.Removed] },
  });

  if (!!karmaCards.length) {
    const virtualCard = karmaCards.find((card) => card.integrations.marqeta?.card_product_token.includes('kw_virt_cps'));
    return !!virtualCard;
  }
  return false;
};
