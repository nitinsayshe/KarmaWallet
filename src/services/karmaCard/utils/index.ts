import puppeteer from 'puppeteer';
import { PaginateResult } from 'mongoose';
import { listCards, terminateMarqetaCards } from '../../../integrations/marqeta/card';
import { getGPABalance } from '../../../integrations/marqeta/gpa';
import { CardStatus, SocketEvents } from '../../../lib/constants';
import { CardModel } from '../../../models/card';
import { IUserDocument } from '../../../models/user';
import { getDaysFromPreviousDate } from '../../../lib/date';
import { MarqetaClient } from '../../../clients/marqeta/marqetaClient';
import { Transactions } from '../../../clients/marqeta/transactions';
import { sleep } from '../../../lib/misc';
import { PersonaInquiryTemplateIdEnum, PersonaInquiryStatusEnum } from '../../../integrations/persona/types';
import { passedInternalKyc } from '../../../integrations/persona';
import { KarmaCardApplicationIterationRequest, KarmaCardApplicationIterationResponse, IApplicationDecision, TransformedResponse, ReasonCode, PuppateerShareASaleParams, ShareASaleXType } from './types';
import { transitionMarqetaUser, transitionMarqetaUserToClosed } from '../../../integrations/marqeta/user';
import { ACHFundingSourceModel } from '../../../models/achFundingSource';
import { BankConnectionModel } from '../../../models/bankConnection';
import { removeUserFromDebitCardHoldersList } from '../../marketingSubscription/utils';
import { IMarqetaKycState, IMarqetaUserStatus } from '../../../integrations/marqeta/user/types';
import { GroupModel } from '../../../models/group';
import { KarmaMembershipStatusEnum } from '../../../models/user/types';
import { executeOrderKarmaWalletCardsJob } from '../../card/utils';
import { joinGroup } from '../../groups';
import { IActiveCampaignSubscribeData, updateNewUserSubscriptions } from '../../marketingSubscription';
import { IUrlParam } from '../../user/types';
import { createKarmaCardWelcomeUserNotification } from '../../user_notification';
import { IGPABalanceResponse } from '../../../integrations/marqeta/types';
import { KarmaCardApplicationModel } from '../../../models/karmaCardApplication';
import { IKarmaCardApplicationDocument } from '../../../models/karmaCardApplication/types';
import { createShareasaleTrackingId } from '../../user/utils';
import { ActiveCampaignCustomTags } from '../../../lib/constants/activecampaign';
import { SocketEventTypes, SocketRooms } from '../../../lib/constants/sockets';
import { SocketClient } from '../../../clients/socket';

export const iterateOverKarmaCardApplicationsAndExecWithDelay = async <ReqFieldsType, ResFieldsType>(
  request: KarmaCardApplicationIterationRequest<ReqFieldsType>,
  exec: (req: KarmaCardApplicationIterationRequest<ReqFieldsType>, visitorBatch: PaginateResult<IKarmaCardApplicationDocument>) => Promise<KarmaCardApplicationIterationResponse<ResFieldsType>[]>,
  msDelayBetweenBatches: number,
): Promise<KarmaCardApplicationIterationResponse<ResFieldsType>[]> => {
  let report: KarmaCardApplicationIterationResponse<ResFieldsType>[] = [];

  let page = 1;
  let hasNextPage = true;
  while (hasNextPage) {
    const applicationBatch = await KarmaCardApplicationModel.paginate(request.batchQuery, {
      page,
      limit: request.batchLimit,
    });

    console.log('total applications matching query: ', applicationBatch.totalDocs);
    const responses = await exec(request, applicationBatch);

    console.log(`Prepared ${responses.length} visitor reports`);
    report = report.concat(responses);

    await sleep(msDelayBetweenBatches);

    hasNextPage = applicationBatch?.hasNextPage || false;
    page++;
  }
  return report;
};

export const getApplicationDecisionData = (res: IApplicationDecision): TransformedResponse => {
  if (!res) return;
  const marqeta = res?.marqeta;
  const kycResult = marqeta?.kycResult;
  const persona = res?.persona;
  const paidMembership = res?.paidMembership;
  const internalKycTemplateId = res?.internalKycTemplateId;
  const reasonCodes = kycResult?.codes as ReasonCode[];
  const failedMarqeta: ReasonCode = reasonCodes?.find((code: ReasonCode) => code !== ReasonCode.Approved) as ReasonCode;

  if (paidMembership) {
    return {
      status: IMarqetaKycState.success,
      reason: ReasonCode.Approved,
      internalKycTemplateId,
    };
  }

  if (failedMarqeta) {
    return {
      status: IMarqetaKycState.failure,
      reason: failedMarqeta,
      internalKycTemplateId,
    };
  }

  const passedPersona = passedInternalKyc(persona);

  // if all inquiries are in a pending state and no cases
  const allPersonaInquiriesInPendingAndNoCases = persona?.inquiries?.every((inquiry) => inquiry.status === PersonaInquiryStatusEnum.Pending) && !persona?.cases?.length;

  if (!!persona && !passedPersona) {
    return {
      status: allPersonaInquiriesInPendingAndNoCases ? IMarqetaKycState.pending : IMarqetaKycState.failure,
      reason: ReasonCode.FailedInternalKyc,
      internalKycTemplateId: allPersonaInquiriesInPendingAndNoCases ? PersonaInquiryTemplateIdEnum.DataCollection : internalKycTemplateId,
    };
  }

  const transformed: TransformedResponse = {
    status: kycResult?.status || undefined,
    reason: reasonCodes?.[0],
    internalKycTemplateId,
    paymentData: res.paymentData,
  };

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
      img.src = `https://www.shareasale.com/sale.cfm?tracking=${trackingID}&amount=0.00&merchantID=134163&transtype=lead&xType=${xType}`;
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

export const addShareASaleTrackingToUser = async (user: IUserDocument) => {
  try {
    const sscid = user.integrations.shareasale?.sscid;
    const sscidCreatedOn = user.integrations.shareasale?.sscidCreatedOn;
    const xType = user.integrations.shareasale?.xTypeParam;
    user.integrations.shareasale = {
      sscid,
      sscidCreatedOn,
      xTypeParam: xType,
    };

    if (!!sscid && !!sscidCreatedOn && !!xType) {
      const trackingId = await createShareasaleTrackingId();
      user.integrations.shareasale.trackingId = trackingId || null;
      await openBrowserAndAddShareASaleCode({ sscid, trackingid: trackingId, xtype: xType, sscidCreatedOn });
    } else {
      console.log('User does not have shareasale tracking info');
    }
    await user.save();
  } catch (error) {
    console.error('Error adding shareasale tracking to user', error);
  }
};

export const updateActiveCampaignDataAndJoinGroupForApplicant = async (userObject: IUserDocument, urlParams?: IUrlParam[]) => {
  const subscribeData: IActiveCampaignSubscribeData = {
    debitCardholder: true,
    tags: [ActiveCampaignCustomTags.MembershipPaid],
  };

  if (!!urlParams) {
    const groupCode = urlParams.find((param) => param.key === 'groupCode')?.value;

    if (!!groupCode) {
      const existingGroup = await GroupModel.findOne({ code: groupCode });
      if (existingGroup) {
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
          subscribeData.tags.push(group.name);
        }
      } else {
        console.log('Group not found');
      }
    }
  }
  await updateNewUserSubscriptions(userObject, subscribeData);
  return userObject;
};

export const emitSuccessDecisionToSocket = (email: string, result: IApplicationDecision) => {
  console.log(`Emitting application decision to room: ${SocketRooms.CardApplication}/${email}`);
  const data = getApplicationDecisionData(result);
  SocketClient.socket.emit({
    rooms: [`${SocketRooms.CardApplication}/${email}`],
    eventName: SocketEvents.Update,
    type: SocketEventTypes.CardApplicationDecision,
    data,
  });
};

export const handleUserPaidMembership = async (user: IUserDocument) => {
  // mark membership as paid
  // order cards
  // send welcome email
  // update in active campaign
  try {
    user.karmaMembership.status = KarmaMembershipStatusEnum.active;
    await user.save();
    await transitionMarqetaUser({
      userToken: user.integrations.marqeta.userToken,
      channel: 'API',
      reason: 'User Paid Membership',
      reasonCode: '01',
      status: IMarqetaUserStatus.ACTIVE,
    });
    const userEmail = user.emails.find((e) => e.primary)?.email;
    await emitSuccessDecisionToSocket(userEmail, { paidMembership: true });
    executeOrderKarmaWalletCardsJob(user);
    await createKarmaCardWelcomeUserNotification(user, false);
    await updateActiveCampaignDataAndJoinGroupForApplicant(user, user?.integrations?.referrals?.params);
    await addShareASaleTrackingToUser(user);
  } catch (error) {
    console.log('Error handling user paid membership', error);
  }
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
    await removeUserFromDebitCardHoldersList(userObject);

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
