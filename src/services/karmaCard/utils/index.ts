import { Card } from '../../../clients/marqeta/card';
import { MarqetaClient } from '../../../clients/marqeta/marqetaClient';
import { terminateMarqetaCards, transitionMarqetaUserToClosed } from '../../../integrations/marqeta/card';
import { getGPABalance } from '../../../integrations/marqeta/gpa';
import { IGPABalanceResponse, IGPABalanceResponseData, IMarqetaKycState, MarqetaCardState } from '../../../integrations/marqeta/types';
import { CardModel } from '../../../models/card';
import { TransactionModel } from '../../../models/transaction';
import { IUserDocument } from '../../../models/user';

enum ResponseMessages {
  APPROVED = 'Your Karma Wallet Card will be mailed to your address within 5-7 business days.',
  NAME_ISSUE = 'Your application is pending due to an invalid or mismatched name.',
  ADDRESS_ISSUE = 'Your application is pending due to a missing, invalid, or mismatched address or a PO Box issue. (PO Boxes are not a valid address for validation purposes)',
  DATE_OF_BIRTH_ISSUE = 'Your application is pending due to an invalid or mismatched date of birth.',
  SSN_ISSUE = 'Your application is pending due to a missing, invalid or mismatched Social Security Number (SSN).',
  DECLINED = 'Your application has been declined.'
}

enum SolutionMessages {
  NAME_OR_DOB_ISSUE = 'Please submit one of the following unexpired government-issued photo identification items that shows name and date of birth to support@karmawallet.io',
  SSN_ISSUE = 'Please submit a photo of the following items to support@karmawallet.io',
  ADDRESS_ISSUE = 'Please submit two of the following documents that show your full name and address to support@karmawallet.io',
  CONTACT_SUPPORT = 'This outcome requires a manual review by Karma Wallet to determine the next appropriate step. Contact support@karmawallet.io.',
  ALREADY_REGISTERED = 'You already have a Karma Wallet Card. We currently only allow one Karma Wallet Card per account.',
}

const AcceptedDocuments = {
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
  DateOfBirthIssue: [
    'Driver’s license or state-issued identification card',
    'Passport or US passport card',
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
    status: kycResult?.status as IMarqetaKycState || IMarqetaKycState.failure,
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
  });
  return !!karmaCards.length;
};

export const getKarmaWalletCardBalance = async (userObject: IUserDocument) => {
  try {
    if (!userObject.integrations.marqeta) {
      console.log('////// User does not have any marqeta cards');
      return;
    }
  
    const marqetaUserId = userObject.integrations.marqeta.userToken;
    const balanceData = await getGPABalance(marqetaUserId);
    if (!balanceData) {
      console.log('////// No balance data found for user');
      return;
    } else {
      return balanceData.data;
    }
  } catch (err) {
    console.error('Error getting Karma Wallet Card balance', err);
  }
}

export const checkIfPendingMarqetaTransactions = async (gpa: IGPABalanceResponseData) => {
  if (!!gpa.pending_credits) {
    throw new Error('[+] User has pending credits, account cannot be closed yet.');
  }

  const pendingTransactions = await TransactionModel.find({
    'integrations.marqeta': { $exists: true },
    status: 'pending',
  });

  if (!!pendingTransactions.length) {
    throw new Error('[+] User has pending transactions, account cannot be closed yet.');
  }

  return false;
};

export const closeKarmaCard = async (userObject: IUserDocument) => {
  if (!userObject.integrations.marqeta) {
    console.log('[+] User does not have a Marqeta integration skip this step');
    return;
  }

  const userGPABalance: IGPABalanceResponse = await getKarmaWalletCardBalance(userObject);
  const pendingTransactions = await checkIfPendingMarqetaTransactions(userGPABalance.gpa);
  const existingBalance = userGPABalance.gpa.available_balance;

  if (!!existingBalance) {
    throw new Error('[+] User has a balance on their Karma Wallet Card. Manual review required');
  }

  if (!pendingTransactions) {
    const karmaCards = await CardModel.find({
      userId: userObject._id.toString(),
      'integrations.marqeta': { $exists: true },
    });

    if (!karmaCards.length) {
      console.log('[+] User does not have any marqeta cards');
      return;
    } else {
      const transitionedCards = await terminateMarqetaCards(karmaCards);
      if (transitionedCards.length === karmaCards.length) {
        console.log('[+] All Marqeta cards have been terminated');
      } else {
        throw new Error('[+] Error terminating Marqeta cards');
      }
    }

    const closeUser = await transitionMarqetaUserToClosed(userObject);
    if (closeUser) {
      console.log('[+] User has been transitioned to Closed status in Marqeta');
    } else {
      throw new Error('[+] Error transitioning Marqeta user to closed');
    }
  } 
}