import puppeteer from 'puppeteer';
import { terminateMarqetaCards, listCards } from '../../../integrations/marqeta/card';
import { getGPABalance } from '../../../integrations/marqeta/gpa';
import { IGPABalanceResponse, IMarqetaKycState } from '../../../integrations/marqeta/types';
import { CardStatus } from '../../../lib/constants';
import { CardModel } from '../../../models/card';
import { GroupModel } from '../../../models/group';
import { IUserDocument } from '../../../models/user';
import { joinGroup } from '../../groups/utils';
import { IActiveCampaignSubscribeData, updateNewUserSubscriptions } from '../../subscription';
import { getDaysFromPreviousDate } from '../../../lib/date';
import { IUrlParam } from '../../user/types';
import { transitionMarqetaUserToClosed } from '../../../integrations/marqeta/user';
import { ACHFundingSourceModel } from '../../../models/achFundingSource';
import { BankConnectionModel } from '../../../models/bankConnection';
import { MarqetaClient } from '../../../clients/marqeta/marqetaClient';
import { Transactions } from '../../../clients/marqeta/transactions';

enum ResponseMessages {
  APPROVED = 'Your Karma Wallet Card will be mailed to your address within 5-7 business days.',
  NAME_ISSUE = 'Your application is pending due to an invalid or mismatched name.',
  ADDRESS_ISSUE = 'Your application is pending due to a missing, invalid, or mismatched address or a PO Box issue. (PO Boxes are not a valid address for validation purposes)',
  DATE_OF_BIRTH_ISSUE = 'Your application is pending due to an invalid or mismatched date of birth.',
  SSN_ISSUE = 'Your application is pending due to a missing, invalid or mismatched Social Security Number (SSN).',
  DECLINED = 'Your application has been declined.',
}

export enum SolutionMessages {
  NAME_OR_DOB_ISSUE = 'To proceed with your application, we kindly request that you submit one of the following unexpired government-issued photo identification items that shows name and date of birth to support@karmawallet.io within 10 days',
  SSN_ISSUE = 'To proceed with your application, we kindly request that you submit a photo of one of the following items to support@karmawallet.io within 10 days',
  ADDRESS_ISSUE = 'To proceed with your application, we kindly request you submit photos of two of the following documents showing your full name and address to support@karmawallet.io within 10 days',
  CONTACT_SUPPORT = 'This outcome requires a manual review by Karma Wallet to determine the next appropriate steps. Contact support@karmawallet.io.',
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

export enum ShareASaleXType {
  FREE = 'FREE',
}

interface PuppateerShareASaleParams {
  sscid: string;
  trackingid: string;
  xtype: string;
  sscidCreatedOn: string;
}

interface TransformedResponse {
  message: string;
  status: IMarqetaKycState;
  reason?: ReasonCode;
  acceptedDocuments?: string[];
  solutionText?: string;
  internalKycTemplateId?: string;
  authkey?: string;
}

export interface SourceResponse {
  userToken: string;
  email: string;
  kycResult: {
    status: string;
    codes: ReasonCode[];
  };
}

export type ApplicationDecision = Partial<SourceResponse> & { internalKycTemplateId?: string };

export const getShareableMarqetaUser = (res: ApplicationDecision): TransformedResponse => {
  if (!res) return;
  const { internalKycTemplateId, kycResult } = res;

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
    [ReasonCode.FailedInternalKyc]: null,
    [ReasonCode.OFACFailure]: null,
    [ReasonCode.Already_Registered]: null,
  };

  // send the marqeta failure code over the internal kyc failure code since that indicates a more severe issue
  let reasonCode: ReasonCode;
  if (kycResult?.codes?.length > 1) {
    if (kycResult.codes.includes(ReasonCode.Approved)) {
      reasonCode = kycResult.codes.find((code: ReasonCode) => code !== ReasonCode.Approved);
    } else if (kycResult.codes.includes(ReasonCode.FailedInternalKyc)) {
      reasonCode = kycResult.codes.find((code: ReasonCode) => code !== ReasonCode.FailedInternalKyc);
    }
  } else {
    reasonCode = kycResult?.codes?.[0];
  }

  const transformed: TransformedResponse = {
    status: (kycResult?.status as IMarqetaKycState) || IMarqetaKycState.failure,
    reason: reasonCode,
    message: messages[reasonCode],
    internalKycTemplateId,
  };

  if (solutionText[kycResult?.codes?.[0] as ReasonCode]) transformed.solutionText = solutionText[kycResult.codes?.[0] as ReasonCode];
  if (acceptedDocuments[kycResult?.codes?.[0] as ReasonCode]) {
    transformed.acceptedDocuments = acceptedDocuments[kycResult?.codes?.[0] as ReasonCode];
  }

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
    }
    return balanceData.data;
  } catch (err) {
    console.error('Error getting Karma Wallet Card balance', err);
  }
};

export const checkIfUserHasPendingTransactionsInMarqeta = async (user: IUserDocument) => {
  if (!user?.integrations?.marqeta?.userToken) {
    console.log('[+] User has no marqeta integration');
    return false;
  }

  const marqetaClient = new MarqetaClient();
  const transactionClient = new Transactions(marqetaClient);
  const currentMarqetaData = await transactionClient.listTransactionsForUser(user.integrations.marqeta.userToken, '&status=PENDING');

  if (!currentMarqetaData || currentMarqetaData.count === 0) {
    console.log('[+] No marqeta data found for user');
    return false;
  }

  return true;
};

export const closeKarmaCard = async (userObject: IUserDocument) => {
  if (!userObject.integrations.marqeta) {
    console.log('[+] User does not have a Marqeta integration skip this step');
    return;
  }

  const userGPABalance: IGPABalanceResponse = await getKarmaWalletCardBalance(userObject);
  // Check if any pending credits
  if (!!userGPABalance.gpa?.pending_credits) {
    throw new Error('[+] User has pending credits, account cannot be closed yet.');
  }
  // check if any pending transactions
  const pendingTransactions = await checkIfUserHasPendingTransactionsInMarqeta(userObject);
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
    }
    const transitionedCards = await terminateMarqetaCards(karmaCards);
    if (transitionedCards.length === karmaCards.length) {
      console.log('[+] All Marqeta cards have been terminated');
    } else {
      throw new Error('[+] Error terminating Marqeta cards');
    }

    const closeUser = await transitionMarqetaUserToClosed(userObject);

    if (closeUser) {
      console.log('[+] User has been transitioned to Closed status in Marqeta');
    } else {
      throw new Error('[+] Error transitioning Marqeta user to closed');
    }

    // delete ach_funding_sources and bank connection
    await ACHFundingSourceModel.deleteMany({ userId: userObject._id.toString() });
    await BankConnectionModel.deleteMany({ userId: userObject._id.toString() });
  } else {
    console.log('///// User has no pending transactions with Marqeta');
  }
};
// get a breakdown a user's Karma Wallet cards
export const karmaWalletCardBreakdown = async (userObject: IUserDocument) => {
  const cardsInMarqeta = await listCards(userObject.integrations.marqeta.userToken);
  const cardsArray = cardsInMarqeta.cards.data;
  if (!cardsArray.length) return { virtualCards: 0, physicalCard: 0 };

  const virtualCard = cardsArray.filter((card) => card.card_product_token.includes('kw_virt'));
  const physicalCard = cardsArray.filter((card) => card.card_product_token.includes('kw_phys'));

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

export const openBrowserAndAddShareASaleCode = async (shareASaleInfo: PuppateerShareASaleParams) => {
  const { sscid, trackingid, xtype, sscidCreatedOn } = shareASaleInfo;

  if (!sscid || !trackingid || !xtype || !sscidCreatedOn) return;

  if (xtype !== ShareASaleXType.FREE) return;

  const sscidCreatedOnDate = new Date(sscidCreatedOn);

  const daysBetweenCreatedSscidAndNow = getDaysFromPreviousDate(sscidCreatedOnDate);
  if (daysBetweenCreatedSscidAndNow >= 90) return;

  const browser = await puppeteer.launch({
    headless: true,
  });

  const page = await browser.newPage();

  await page.goto('https://www.karmawallet.io/');
  await page.setCookie({ name: 'sas_m_awin', value: `{"clickId": "${sscid}"}` });

  await page.evaluate(
    (trackingID = trackingid, xType = xtype) => {
      const img = document.createElement('img');
      img.src = `https://www.shareasale.com/sale.cfm?tracking=${trackingID}&amount=0.00&merchantID=134163&transtype=sale&xType=${xType}`;
      img.width = 1;
      img.height = 1;
      document.body.appendChild(img);

      const script = document.createElement('script');
      script.src = 'https://www.dwin1.com/19038.js';
      script.type = 'text/javascript';
      script.defer = true;
      document.body.appendChild(script);
    },
    trackingid,
    xtype,
  );

  // close the browser after 2 seconds with set timeout to allow the page to load. Look into using a better approach?
  setTimeout(async () => {
    await page.close();
    await browser.close();
  }, 2000);
};

export const updateActiveCampaignDataAndJoinGroupForApplicant = async (userObject: IUserDocument, urlParams?: IUrlParam[]) => {
  const subscribeData: IActiveCampaignSubscribeData = {
    debitCardholder: true,
  };

  if (!!urlParams) {
    const groupCode = urlParams.find((param) => param.key === 'groupCode')?.value;
    // employer beta card group
    if (!!urlParams.find((param) => param.key === 'employerBeta')) {
      subscribeData.employerBeta = true;
    }

    // beta card group
    if (!!urlParams.find((param) => param.key === 'beta')) {
      subscribeData.beta = true;
    }

    if (!!groupCode) {
      const mockRequest = {
        requestor: userObject,
        authKey: '',
        body: {
          code: groupCode,
          email: userObject?.emails?.find((e) => e.primary)?.email,
          userId: userObject._id.toString(),
          skipSubscribe: true,
        },
      } as any;

      const userGroup = await joinGroup(mockRequest);
      if (!!userGroup) {
        const group = await GroupModel.findById(userGroup.group);
        subscribeData.groupName = group.name;
        subscribeData.tags = [group.name];
      }
    }
  }
  await updateNewUserSubscriptions(userObject, subscribeData);
  return userObject;
};
