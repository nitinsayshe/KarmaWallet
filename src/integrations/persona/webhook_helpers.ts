import { FilterQuery } from 'mongoose';
import { createOrUpdatePersonaIntegration, hasInquiriesOrCases, passedInternalKyc } from '.';
import { MarqetaReasonCodeEnum } from '../../clients/marqeta/types';
import { getUtcDate } from '../../lib/date';
import { KarmaCardApplicationModel, ApplicationStatus, IKarmaCardApplicationDocument } from '../../models/karmaCardApplication';
import { UserModel, IUserDocument } from '../../models/user';
import { VisitorModel, VisitorActionEnum, IVisitorDocument } from '../../models/visitor';
import { getShareableMarqetaUser, ReasonCode, IApplicationDecision } from '../../services/karmaCard/utils';
import { SocketClient } from '../../clients/socket';
import { IRequest } from '../../types/request';
import {
  PersonaWebhookBody,
  PersonaInquiryTemplateIdEnum,
  PersonaInquiryStatusEnum,
  EventNamesEnum,
  PersonaInquiryTemplateIdEnumValues,
  PersonaCaseStatusEnum,
  PersonaInquiryStatusEnumValues,
  IPersonaCaseData,
  PersonaCaseStatusEnumValues,
} from './types';
import { IKarmaCardRequestBody, applyForKarmaCard, getApplicationData, continueKarmaCardApplication } from '../../services/karmaCard';
import { IUserNotificationDocument, UserNotificationModel } from '../../models/user_notification';
import { NotificationTypeEnum } from '../../lib/constants/notification';
import {
  createDeclinedKarmaWalletCardUserNotification,
  createPendingReviewKarmaWalletCardUserNotification,
  createResumeKarmaCardApplicationUserNotification,
} from '../../services/user_notification';
import { PersonaHostedFlowBaseUrl } from '../../clients/persona';
import { states } from '../../lib/constants/states';
import { IKarmaCardUpdateData, IKarmaCardDeclinedEmailData } from '../../services/email/types';
import { isUserDocument } from '../../services/user/utils';
import { IMarqetaKycState, IMarqetaUserStatus } from '../marqeta/types';
import { updateMarqetaUserStatus } from '../marqeta/user';
import { SocketEvents, daysUntilKarmaCardApplicationExpiration } from '../../lib/constants';
import { SocketRooms, SocketEventTypes } from '../../lib/constants/sockets';
import { updateUserSubscriptions, updateVisitorSubscriptions } from '../../services/marketingSubscription';
import { ActiveCampaignListId, MarketingSubscriptionCode } from '../../types/marketing_subscription';
import { unsubscribeContactFromLists } from '../activecampaign';

const PhoneNumberLength = 10;
const PostalCodeLength = 5;

export const hasSavedApplicationAndKycResult = (application: IKarmaCardApplicationDocument, existingApplicationData: IApplicationDecision): boolean => {
  const hasPersonaCaseOrInquiryData = hasInquiriesOrCases(existingApplicationData?.persona);
  return !!application && !!existingApplicationData?.marqeta?.kycResult?.status && hasPersonaCaseOrInquiryData;
};

export const startApplicationFromInquiry = async (req: PersonaWebhookBody): Promise<IApplicationDecision> => {
  // start the application process
  const inquiryData = req?.data?.attributes?.payload?.data?.attributes;
  const applicationData = req?.data?.attributes?.payload?.data?.attributes.fields?.applicationData?.value;

  let phone = inquiryData?.phoneNumber?.replace(/[^\d]/g, '');
  if (phone?.length > PhoneNumberLength) {
    phone = phone?.substring(phone.length - PhoneNumberLength);
  }

  let postalCode = inquiryData?.addressPostalCode?.trim();
  if (postalCode?.length > PostalCodeLength) {
    postalCode = postalCode?.substring(0, PostalCodeLength);
  }

  const applicationBody: IKarmaCardRequestBody = {
    address1: inquiryData?.addressStreet1?.trim(),
    address2: inquiryData?.addressStreet2?.trim(),
    birthDate: inquiryData?.birthdate,
    phone,
    city: inquiryData?.addressCity?.trim(),
    email: applicationData?.email,
    firstName: inquiryData?.nameFirst?.trim(),
    lastName: inquiryData?.nameLast?.trim(),
    personaInquiryId: req?.data?.attributes?.payload?.data?.id,
    postalCode,
    ssn: inquiryData?.socialSecurityNumber?.trim()?.replace(/-/g, ''),
    state:
      inquiryData?.addressSubdivisionAbbr?.toUpperCase()
      || states.find((state: any) => state.name?.toLowerCase() === inquiryData?.addressSubdivision?.toLowerCase())?.abbreviation,
    urlParams: applicationData?.urlParams,
    sscid: applicationData?.sscid,
    sscidCreatedOn: applicationData?.sscidCreatedOn,
    xType: applicationData?.xType,
  };

  try {
    const existingUser = await UserModel.findOne({ 'emails.email': applicationData?.email });
    const mockRequest = {
      body: applicationBody,
      params: {},
      requestor: (existingUser as IUserDocument) || undefined,
      authKey: '',
    } as IRequest<{}, {}, IKarmaCardRequestBody>;
    return applyForKarmaCard(mockRequest);
  } catch (e) {
    console.log(`Error in startApplicationFromInquiry: ${e}`);
  }
};

const emitDecisionToSocket = (email: string, inquiryId: string, result: IApplicationDecision) => {
  console.log(`Emitting application decision to room: ${SocketRooms.CardApplication}/${email} for inquiryId or caseId: ${inquiryId}`);
  const data = getShareableMarqetaUser(result);
  SocketClient.socket.emit({
    rooms: [`${SocketRooms.CardApplication}/${email}`],
    eventName: SocketEvents.Update,
    type: SocketEventTypes.CardApplicationDecision,
    data,
  });
};

const getUserApplicationStatus = async (email: string): Promise<IApplicationDecision> => {
  try {
    if (!email) {
      throw new Error('No email found');
    }
    const application = await getApplicationData(email);
    return application;
  } catch (e) {
    return null;
  }
};

export const getUserOrVisitorFromAccountId = async (accountId: string): Promise<IUserDocument | IVisitorDocument> => {
  try {
    const user = await UserModel.findOne({ 'integrations.persona.accountId': accountId });
    if (!!user) {
      return user;
    }
    const visitor = await VisitorModel.findOne({ 'integrations.persona.accountId': accountId });
    if (!!visitor) {
      return visitor;
    }
  } catch (e) {
    console.log(`Error finding user from persona account id: ${e}`);
  }
  return null;
};

export const getEmailFromUserOrVisitor = (entity: IUserDocument | IVisitorDocument): string => {
  if (!entity) return null;
  if (isUserDocument(entity)) {
    return entity.emails.find((email) => email.primary)?.email;
  }
  return entity.email;
};

export const continueApplyProcessForApprovedCase = async (req: PersonaWebhookBody) => {
  try {
    const accountId = req?.data?.attributes?.payload?.data?.relationships?.accounts?.data?.[0]?.id;
    const entity = await getUserOrVisitorFromAccountId(accountId);
    const applicationData = req?.data?.attributes?.payload?.data?.attributes.fields?.applicationData?.value;
    const email = getEmailFromUserOrVisitor(entity) || applicationData?.email;
    if (!email) {
      throw new Error('No email found');
    }
    const application = await KarmaCardApplicationModel.findOne({ email });
    const caseId = req?.data?.attributes?.payload?.data?.id;
    const caseStatus = req?.data?.attributes?.payload?.data?.attributes?.status;

    let applicationStatus = await getUserApplicationStatus(email);
    if (!applicationStatus) {
      throw new Error(`No saved application status found for user with email: ${email}`);
    }
    if (!!application?.expirationDate && application?.expirationDate < getUtcDate().toDate()) {
      console.log(`Application for email: ${email} has expired`);
      return;
    }

    const kycStatus = applicationStatus?.marqeta?.kycResult?.status;
    const passedKyc = kycStatus === IMarqetaKycState.success && passedInternalKyc(entity?.integrations?.persona);
    if (passedKyc && !!application && application?.status === ApplicationStatus.SUCCESS) {
      console.log(`User with email: ${email} has already been approved for a card`);
      return;
    }

    if (!caseId) {
      console.log(`No caseId found in webhook for email: ${email}`);
      return;
    }

    // here kycStatus can be failed and will be updated in the continue process
    if (hasSavedApplicationAndKycResult(application, applicationStatus)) {
      applicationStatus = await continueKarmaCardApplication(email, null, caseId);
    } else {
      console.log(`No action taken for case with id ${caseId} with status: ${caseStatus}`);
    }
  } catch (e) {
    console.log(`Error in application process: ${e}`);
  }
};

export const startOrContinueApplyProcessForTransitionedInquiry = async (req: PersonaWebhookBody) => {
  // check if the user has an appliction in progress
  // if so, update the persona application status
  // run the user through the continue application flow
  try {
    const applicationData = req?.data?.attributes?.payload?.data?.attributes.fields?.applicationData?.value;
    const accountId = req?.data?.attributes?.payload?.data?.relationships?.account?.data?.id;
    const entity = await getUserOrVisitorFromAccountId(accountId);
    const email = getEmailFromUserOrVisitor(entity) || applicationData?.email;
    if (!email) {
      throw new Error('No email found');
    }
    const application = await KarmaCardApplicationModel.findOne({ email });
    if (!!application?.expirationDate && application?.expirationDate < getUtcDate().toDate()) {
      console.log(`Application for email: ${email} has expired`);
      return;
    }

    const inquiryTemplateId = req?.data?.attributes?.payload?.data?.relationships?.inquiryTemplate?.data?.id;
    const inquiryId = req?.data?.attributes?.payload?.data?.id;
    const inquiryStatus = req?.data?.attributes?.payload?.data?.attributes?.status;

    let existingApplicationData = await getUserApplicationStatus(email);
    const kycStatus = existingApplicationData?.marqeta?.kycResult?.status;
    const passedKyc = kycStatus === IMarqetaKycState.success && passedInternalKyc(entity?.integrations?.persona);
    console.log('//// before emission of decision');

    if (passedKyc && !!application && application?.status === ApplicationStatus.SUCCESS) {
      console.log(`User with email: ${email} has already been approved for a card`);
      emitDecisionToSocket(email, inquiryId, existingApplicationData);
      return;
    }

    if (!inquiryId || !inquiryTemplateId) {
      console.log(`No inquiryId or inquiryTemplateId found in webhook for email: ${email}`);
      emitDecisionToSocket(email, inquiryId, existingApplicationData);
      return;
    }

    console.log(`received inquiryId: ${inquiryId} from template: ${inquiryTemplateId})`);

    const isManualApproval = inquiryStatus === PersonaInquiryStatusEnum.Approved;
    const receivedFromDataCollection = inquiryTemplateId === PersonaInquiryTemplateIdEnum.DataCollection;
    /* if (hasSavedApplicationAndKycResult(application, existingApplicationData) && (isManualApproval || receivedFromGovIdAndSelfieOrDocs)) { */
    /*   // if this request is coming from this template, it could have failed db verification, but passed with new document data */
    /*   console.log('going into continueKarmaCardApplication process for inquiry with id: ', inquiryId); */
    /*   existingApplicationData = await continueKarmaCardApplication(email, req.data.attributes.payload.data.id); */
    /* } else  */
    if (receivedFromDataCollection || isManualApproval) {
      console.log('going into startApplicationFromInquiry process for inquiry with id: ', inquiryId);
      existingApplicationData = await startApplicationFromInquiry(req);
    } else {
      console.log(`No action taken for inquiry with id ${inquiryId} from template: ${inquiryTemplateId}`);
    }

    if (!existingApplicationData) {
      throw new Error('No result found');
    }

    console.log('////// return to the webhook', existingApplicationData);

    emitDecisionToSocket(email, inquiryId, existingApplicationData);
  } catch (e) {
    console.log(`Error in application process: ${e}`);
  }
};

export const createVisitorOrUpdatePersonaIntegration = async (email: string, data: PersonaWebhookBody) => {
  try {
    // pull visitor or user from the db
    const user = await UserModel.findOne({ 'emails.email': email });
    let visitor = await VisitorModel.findOne({ email });

    const payloadData = data?.data?.attributes?.payload?.data;
    const accountId = payloadData?.relationships?.accounts?.data?.[0]?.id || payloadData?.relationships?.account?.data?.id;
    const inquiryId = payloadData?.id;
    const sessions = payloadData?.relationships?.sessions?.data;
    const latestSession = sessions?.[sessions?.length > 0 ? sessions.length - 1 : 0];
    const inquiryData = {
      id: inquiryId,
      status: payloadData?.attributes.status as PersonaInquiryStatusEnumValues,
      sessionId: latestSession?.id,
      createdAt: payloadData?.attributes?.createdAt,
      templateId: payloadData?.relationships?.inquiryTemplate?.data?.id,
    };

    if (!user && !visitor) {
      visitor = new VisitorModel();
      visitor.email = email;
      visitor.actions = [
        {
          type: VisitorActionEnum.PendingApplication,
          createdOn: getUtcDate().toDate(),
        },
      ];
    }
    await createOrUpdatePersonaIntegration(user || visitor, accountId, inquiryData);
  } catch (e) {
    console.log(`Error creating/updating visitor or user: ${e}`);
  }
};

export const composePersonaContinueUrl = (templateId: PersonaInquiryTemplateIdEnumValues, accountId: string) => {
  const link = `${PersonaHostedFlowBaseUrl}?template-id=${templateId}&environment-id=${process.env.PERSONA_ENVIRONMENT_ID}&account-id=${accountId}&fields[source]=hosted`;
  return encodeURI(link);
};

export const sendContinueApplicationEmail = async (req: PersonaWebhookBody) => {
  const inquiryTemplateId = req?.data?.attributes?.payload?.data?.relationships?.inquiryTemplate?.data?.id;
  const inquiryId = req?.data?.attributes?.payload?.data?.id;
  const applicationData = req?.data?.attributes?.payload?.data?.attributes.fields?.applicationData?.value;
  const email = applicationData?.email;
  const accountId = req?.data?.attributes?.payload?.data?.relationships?.account?.data?.id;

  if (!email) {
    console.log('No email found in inquiry data');
    return;
  }

  if (!inquiryId || !inquiryTemplateId) {
    console.log(`No inquiryId or inquiryTemplateId found in webhook for email: ${email}`);
    return;
  }

  console.log(`received inquiryId: ${inquiryId} from template: ${inquiryTemplateId})`);
  if (inquiryTemplateId !== PersonaInquiryTemplateIdEnum.DataCollection) {
    console.log('No action taken for inquiry with id: ', inquiryId);
    return;
  }

  const karmaCardApplication = await KarmaCardApplicationModel.findOne({ email });
  if (!karmaCardApplication?._id) {
    console.log(`No karma card application found for email: ${email}`);
  }

  if (karmaCardApplication.status === ApplicationStatus.SUCCESS) {
    console.log(`User with email: ${email} has already been approved for a card`);
    return;
  }

  if (!karmaCardApplication.expirationDate) {
    karmaCardApplication.expirationDate = getUtcDate().add(daysUntilKarmaCardApplicationExpiration, 'day').toDate();
    karmaCardApplication.lastModified = getUtcDate().toDate();
    await karmaCardApplication.save();
  }

  const user = await UserModel.findOne({ 'emails.email': email });
  const visitor = await VisitorModel.findOne({ email });

  if (!user && !visitor) {
    console.log(`No user or visitor found for email: ${email}`);
    return;
  }

  const query: FilterQuery<IUserNotificationDocument> = {
    type: NotificationTypeEnum.ResumeKarmaCardApplication,
  };
  if (!!user) {
    query.user = user._id;
  } else {
    query.visitor = visitor._id;
  }
  // check if they've already received this notification
  const notification = await UserNotificationModel.findOne(query);
  if (notification) {
    console.log(`Notification already queued for user or visitor with email ${email}`);
    return;
  }

  const template = PersonaInquiryTemplateIdEnum.KW5;

  const continueUrl = composePersonaContinueUrl(template, accountId);
  const name = !!user ? user.name : visitor.integrations?.marqeta?.first_name.concat(' ', visitor.integrations?.marqeta?.last_name);
  const applicationExpirationDate = karmaCardApplication?.expirationDate?.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) || '';
  await createResumeKarmaCardApplicationUserNotification({
    name,
    applicationExpirationDate,
    link: continueUrl,
    recipientEmail: email,
    user: !!user ? user : undefined,
    visitor: !!visitor ? visitor : undefined,
  });
};

export const sendPendingEmail = async (email: string, req: PersonaWebhookBody) => {
  const inquiryStatus = req?.data?.attributes?.payload?.data?.attributes?.status;
  const inquiryTemplateId = req?.data?.attributes?.payload?.data?.relationships?.inquiryTemplate?.data?.id;
  const user = await UserModel.findOne({ 'emails.email': email });
  const visitor = await VisitorModel.findOne({ email });

  console.log('////// this is the template id', inquiryTemplateId, '//// status', inquiryStatus);
  const dataObj: IKarmaCardUpdateData = {
    name: '',
  };

  if (user) {
    dataObj.name = user.name;
    dataObj.user = user;
  } else if (visitor) {
    dataObj.name = visitor.integrations?.marqeta?.first_name;
    dataObj.visitor = visitor;
  } else {
    throw new Error('No user or visitor found, not sending pending documents email.');
  }

  if (inquiryTemplateId === PersonaInquiryTemplateIdEnum.KW5 && (inquiryStatus === PersonaInquiryStatusEnum.Failed || inquiryStatus === PersonaInquiryStatusEnum.Completed)) {
    await createPendingReviewKarmaWalletCardUserNotification(dataObj);
  }
};

export const handleCaseApprovedStatus = async (req: PersonaWebhookBody) => {
  await continueApplyProcessForApprovedCase(req);
};

export const updateMarqetaUserStatusToSuspended = async (entity: IUserDocument | IVisitorDocument) => {
  if (entity.integrations?.marqeta?.status !== IMarqetaUserStatus.SUSPENDED && entity.integrations.marqeta?.status !== IMarqetaUserStatus.CLOSED) {
    await updateMarqetaUserStatus(entity, IMarqetaUserStatus.SUSPENDED, MarqetaReasonCodeEnum.FailedKYC);
  }
};

export const updateEntityKycStatus = async (entity: IUserDocument | IVisitorDocument) => {
  // update user or visitor's kycStatus in their marqeta integration
  if (!!entity?.integrations?.marqeta?.kycResult) {
    entity.integrations.marqeta.kycResult.status = IMarqetaKycState.failure;
    const { codes } = entity.integrations.marqeta.kycResult;
    if (!codes.includes(ReasonCode.FailedInternalKyc)) {
      entity.integrations.marqeta.kycResult.codes.push(ReasonCode.FailedInternalKyc);
    }
    await entity.save();
  }
};

export const updateApplicationStatusToDeclined = async (application: IKarmaCardApplicationDocument) => {
  // update status of application in karma application collection
  if (!!application && !application.expirationDate) {
    application.status = ApplicationStatus.DECLINED;
    application.lastModified = getUtcDate().toDate();
    application.expirationDate = getUtcDate().add(daysUntilKarmaCardApplicationExpiration, 'day').toDate();
    await application.save();
  }
};

export const sendDeclinedNotification = async (entity: IUserDocument | IVisitorDocument, application: IKarmaCardApplicationDocument) => {
  const isUser = isUserDocument(entity);
  // send declined email
  const notificationData: IKarmaCardDeclinedEmailData = {
    user: isUser ? entity._id : undefined,
    visitor: !isUser ? entity._id : undefined,
    name: isUser ? entity.name : entity?.integrations?.marqeta?.first_name,
    resubmitDocumentsLink: composePersonaContinueUrl(PersonaInquiryTemplateIdEnum.KW5, entity.integrations.persona.accountId),
    applicationExpirationDate: application.expirationDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  };

  await createDeclinedKarmaWalletCardUserNotification(notificationData);
};

export const removeUserFromDebitCardHoldersList = async (entity: IUserDocument | IVisitorDocument) => {
  const isUser = isUserDocument(entity);
  const entityId = entity._id.toString();
  await unsubscribeContactFromLists(getEmailFromUserOrVisitor(entity), [ActiveCampaignListId.DebitCardHolders]);
  if (isUser) await updateUserSubscriptions(entityId, [], [MarketingSubscriptionCode.debitCardHolders]);
  else await updateVisitorSubscriptions(entityId, [], [MarketingSubscriptionCode.debitCardHolders]);
};

export const handleCaseDeclinedStatus = async (req: PersonaWebhookBody) => {
  const eventId = req.data.id;
  try {
    // get the email from the account id
    const payloadData = req?.data?.attributes?.payload?.data;
    const accountId = payloadData?.relationships?.accounts?.data?.[0]?.id;
    const entity = await getUserOrVisitorFromAccountId(accountId);
    // update the persona integration
    const caseData: IPersonaCaseData = {
      id: payloadData?.id,
      status: payloadData?.attributes.status as PersonaCaseStatusEnumValues,
      createdAt: payloadData?.attributes.createdAt,
    };

    await createOrUpdatePersonaIntegration(entity, accountId, null, caseData);
    const email = getEmailFromUserOrVisitor(entity);

    // find application in karma application collection
    const application = await KarmaCardApplicationModel.findOne({ email });
    await updateApplicationStatusToDeclined(application);
    await updateEntityKycStatus(entity);
    await removeUserFromDebitCardHoldersList(entity);
    await updateMarqetaUserStatusToSuspended(entity);
    await sendDeclinedNotification(entity, application);
  } catch (e) {
    console.log(`Error processing case declined webhook with eventId: ${eventId}`);
    console.log(e);
  }
};

export const handleCaseStatusUpdatedWebhook = async (req: PersonaWebhookBody) => {
  const status = req?.data?.attributes?.payload?.data?.attributes?.status;
  switch (status) {
    case PersonaCaseStatusEnum.Approved:
      console.log('Case approved status');
      await handleCaseApprovedStatus(req);
      break;
    case PersonaCaseStatusEnum.Declined:
      await handleCaseDeclinedStatus(req);
      console.log('Case declined status');
      break;
    default:
      console.log(`Case status not handled: ${status}`);
      break;
  }
};

export const handleInquiryTransitionedWebhook = async (req: PersonaWebhookBody) => {
  const inquiryStatus = req?.data?.attributes?.payload?.data?.attributes?.status;
  const inquiryId = req?.data?.attributes?.payload?.data?.id;
  const email = req?.data?.attributes?.payload?.data?.attributes?.fields?.applicationData?.value?.email;

  switch (inquiryStatus) {
    case PersonaInquiryStatusEnum.Completed:
      console.log('Inquiry completed transitioned inquiry status');
      console.log('going into start or continue apply process for transitioned inquiry with id: ', inquiryId);
      await startOrContinueApplyProcessForTransitionedInquiry(req);
      await sendPendingEmail(email, req);
      break;
    case PersonaInquiryStatusEnum.Approved:
      console.log('Inquiry approved transitioned inquiry status');
      console.log('going into start or continue apply process for transitioned inquiry with id: ', inquiryId);
      await startOrContinueApplyProcessForTransitionedInquiry(req);
      await sendPendingEmail(email, req);
      break;
    case PersonaInquiryStatusEnum.Pending:
      console.log('Inquiry pending transitioned inquiry status');
      // check if a visitor or user exists for this inquiry
      // update the integration if so, otherwise create a new visitor with a persona integration
      await createVisitorOrUpdatePersonaIntegration(email, req);
      break;
    case PersonaInquiryStatusEnum.Failed:
      console.log('Inquiry failed transitioned inquiry status');
      console.log('going into start or continue apply process for transitioned inquiry with id: ', inquiryId);
      await startOrContinueApplyProcessForTransitionedInquiry(req);
      await sendContinueApplicationEmail(req);
      await sendPendingEmail(email, req);
      break;
    default:
      console.log(`Inquiry status not handled: ${inquiryStatus}`);
      break;
  }
};

export const handlePersonaWebhookByEventName = async (req: PersonaWebhookBody) => {
  switch (req?.data?.attributes?.name) {
    case EventNamesEnum.inquiryApproved:
      await handleInquiryTransitionedWebhook(req);
      break;
    case EventNamesEnum.inquiryTransitioned:
      console.log('inquiry.transitioned event');
      await handleInquiryTransitionedWebhook(req);
      break;
    case EventNamesEnum.caseStatusUpdated:
      console.log('case.status-udated event');
      await handleCaseStatusUpdatedWebhook(req);
      break;
    default:
      console.log(`Nothing to do for event with name: ${req.data.attributes.name}`);
      break;
  }
};
