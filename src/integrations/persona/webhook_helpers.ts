import { createOrUpdatePersonaIntegration, fetchInquiryAndCreateOrUpdateIntegration } from '.';
import { MarqetaKYCStatus } from '../../clients/marqeta/types';
import { states, SocketEvents } from '../../lib/constants';
import { SocketRooms, SocketEventTypes } from '../../lib/constants/sockets';
import { getUtcDate } from '../../lib/date';
import { KarmaCardApplicationModel, ApplicationStatus } from '../../models/karmaCardApplication';
import { UserModel, IUserDocument } from '../../models/user';
import { VisitorModel, VisitorActionEnum } from '../../models/visitor';
import { ApplicationDecision, getShareableMarqetaUser, ReasonCode } from '../../services/karmaCard/utils';
import { SocketClient } from '../../clients/socket';
import { IRequest } from '../../types/request';
import {
  PersonaWebhookBody,
  PersonaInquiryTemplateIdEnum,
  PersonaInquiryStatusEnum,
  EventNamesEnum,
  PersonaInquiryTemplateIdEnumValues,
} from './types';
import { IKarmaCardRequestBody, applyForKarmaCard, getApplicationStatus, continueKarmaCardApplication } from '../../services/karmaCard';
import { UserNotificationModel } from '../../models/user_notification';
import { NotificationTypeEnum } from '../../lib/constants/notification';
import { createDeclinedKarmaWalletCardUserNotification, createResumeKarmaCardApplicationUserNotification } from '../../services/user_notification';
import { PersonaHostedFlowBaseUrl } from '../../clients/persona';
import { IDeclinedData } from '../../services/email/types';
import { closeMarqetaAccount } from '../marqeta/user';
import { returnUserOrVisitorFromEmail } from '../../services/user/utils';

const PhoneNumberLength = 10;

export const startApplicationFromInquiry = async (req: PersonaWebhookBody): Promise<ApplicationDecision> => {
  // start the application process
  const inquiryData = req?.data?.attributes?.payload?.data?.attributes;
  const applicationData = req?.data?.attributes?.payload?.data?.attributes.fields?.applicationData?.value;
  const phone = inquiryData?.phoneNumber?.replace(/[^\d]/g, '');
  const applicationBody: IKarmaCardRequestBody = {
    address1: inquiryData?.addressStreet1?.trim(),
    address2: inquiryData?.addressStreet2?.trim(),
    birthDate: inquiryData?.birthdate,
    phone: phone?.length <= PhoneNumberLength ? phone : phone?.substring(phone.length - PhoneNumberLength),
    city: inquiryData?.addressCity?.trim(),
    email: applicationData?.email,
    firstName: inquiryData?.nameFirst?.trim(),
    lastName: inquiryData?.nameLast?.trim(),
    personaInquiryId: req?.data?.attributes?.payload?.data?.id,
    postalCode: inquiryData?.addressPostalCode?.trim(),
    ssn: inquiryData?.socialSecurityNumber?.trim()?.replace(/-/g, ''),
    state:
      inquiryData?.addressSubdivisionAbbr?.toUpperCase()
      || states.find((state) => state.name?.toLowerCase() === inquiryData?.addressSubdivision?.toLowerCase())?.abbreviation,
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

const emitDecisionToSocket = (email: string, inquiryId: string, result: ApplicationDecision) => {
  console.log(`Emitting application decision to room: ${SocketRooms.CardApplication}/${email} for inquiryId: ${inquiryId}`);
  const data = getShareableMarqetaUser(result);
  SocketClient.socket.emit({
    rooms: [`${SocketRooms.CardApplication}/${email}`],
    eventName: SocketEvents.Update,
    type: SocketEventTypes.CardApplicationDecision,
    data,
  });
};

const getUserApplicationStatus = async (email: string) => {
  try {
    if (!email) {
      throw new Error('No email found');
    }
    const application = await getApplicationStatus(email);
    return application;
  } catch (e) {
    return null;
  }
};

export const startOrContinueApplyProcessForTransitionedInquiry = async (req: PersonaWebhookBody) => {
  // check if the user has an appliction in progress
  // if so, update the persona application status
  // run the user through the continue application flow
  try {
    const applicationData = req?.data?.attributes?.payload?.data?.attributes.fields?.applicationData?.value;
    const email = applicationData?.email;
    if (!email) {
      throw new Error('No email found');
    }
    const application = await KarmaCardApplicationModel.findOne({ email });
    const inquiryTemplateId = req?.data?.attributes?.payload?.data?.relationships?.inquiryTemplate?.data?.id;
    const inquiryId = req?.data?.attributes?.payload?.data?.id;

    let applicationStatus = await getUserApplicationStatus(email);
    const kycStatus = applicationStatus?.kycResult?.status;
    if (kycStatus === MarqetaKYCStatus.SUCCESS || (!!application && application?.status === ApplicationStatus.SUCCESS)) {
      console.log(`User with email: ${email} has already been approved for a card`);
      emitDecisionToSocket(email, inquiryId, applicationStatus);
      return;
    }

    if (!inquiryId || !inquiryTemplateId) {
      console.log(`No inquiryId or inquiryTemplateId found in webhook for email: ${email}`);
      emitDecisionToSocket(email, inquiryId, applicationStatus);
      return;
    }

    console.log(`received inquiryId: ${inquiryId} from template: ${inquiryTemplateId})`);
    if (
      !!application
      && !!applicationStatus?.kycResult?.status
      && inquiryTemplateId === PersonaInquiryTemplateIdEnum.GovIdAndSelfieOrDocs
    ) {
      // if this request is coming from this template, it could have failed db verification, but passed with new document data
      console.log('going into continueKarmaCardApplication process for inquiry with id: ', inquiryId);
      applicationStatus = await continueKarmaCardApplication(email, req.data.attributes.payload.data.id);
    } else if (inquiryTemplateId === PersonaInquiryTemplateIdEnum.DataCollection) {
      console.log('going into startApplicationFromInquiry process for inquiry with id: ', inquiryId);
      applicationStatus = await startApplicationFromInquiry(req);
    } else {
      console.log(`No action taken for inquiry with id ${inquiryId} from template: ${inquiryTemplateId}`);
    }

    if (!applicationStatus) {
      throw new Error('No result found');
    }

    console.log(`Emitting application status for email: ${email} => ${applicationStatus}`);
    emitDecisionToSocket(email, inquiryId, applicationStatus);
  } catch (e) {
    console.log(`Error in application process: ${e}`);
  }
};

export const createVisitorOrUpdatePersonaIntegration = async (email: string, data: PersonaWebhookBody) => {
  try {
    // pull visitor or email from the db
    const user = await UserModel.findOne({ 'emails.email': email });
    let visitor = await VisitorModel.findOne({ email });

    const accountId = data?.data?.attributes?.payload?.data?.relationships?.account?.data?.id;
    const inquiryId = data?.data?.attributes?.payload?.data?.id;
    const sessions = data?.data?.attributes?.payload?.data?.relationships?.sessions?.data;
    const latestSession = sessions?.[sessions?.length > 0 ? sessions.length - 1 : 0];
    const inquiryData = {
      id: inquiryId,
      status: data?.data?.attributes?.payload?.data?.attributes.status,
      sessionId: latestSession?.id,
      createdAt: data?.data?.attributes?.payload?.data?.attributes?.createdAt,
      templateId: data?.data?.attributes?.payload?.data?.relationships?.inquiryTemplate?.data?.id,
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

export const composePersonaContinueUrl = (email: string, templateId: PersonaInquiryTemplateIdEnumValues, accountId: string) => `${PersonaHostedFlowBaseUrl}?template-id=${templateId}&environment-id=${process.env.PERSONA_ENVIRONMENT_ID}&account-id=${accountId}&fields[application-data][email]=${email}&fields[source]=embedded`;

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
  }
  // pull the application
  const decision = await getUserApplicationStatus(email);
  // if they failed marqeta, proceed with gov id, selfie, and doc verification
  const failedMarqeta = decision?.kycResult?.status === MarqetaKYCStatus.FAILURE
    && decision?.kycResult?.codes.length > 0
    && !decision?.kycResult?.codes?.includes(ReasonCode.Approved);

  // check if they've already received this notification
  const user = await UserModel.findOne({ 'emails.email': email });
  const visitor = await VisitorModel.findOne({ email });

  if (!user && !visitor) {
    console.log(`No user or visitor found for email: ${email}`);
    return;
  }
  const notification = UserNotificationModel.findOne({
    $or: [{ user: user._id }, { visitor: visitor._id }],
    type: NotificationTypeEnum.ResumeKarmaCardApplication,
  });
  if (notification) {
    console.log(`Notification already queued for user or visitor with email ${email}`);
    return;
  }

  let template: PersonaInquiryTemplateIdEnumValues;
  if (failedMarqeta) {
    template = PersonaInquiryTemplateIdEnum.GovIdAndSelfieOrDocs;
  } else {
    template = PersonaInquiryTemplateIdEnum.GovIdAndSelfieOrDocs;
  }
  const continueUrl = composePersonaContinueUrl(email, template, accountId);

  await createResumeKarmaCardApplicationUserNotification({
    link: continueUrl,
    recipientEmail: email,
    user,
    visitor,
  });
};

export const sendPendingEmail = async (email: string, req: PersonaWebhookBody) => {
  const inquiryStatus = req?.data?.attributes?.payload?.data?.attributes?.status;
  const inquiryTemplateId = req?.data?.attributes?.payload?.data?.relationships?.inquiryTemplate?.data?.id;
  const user = await UserModel.findOne({ 'emails.email': email });
  const visitor = await VisitorModel.findOne({ email });

  const dataObj: IDeclinedData = {
    name: '',
  };

  if (user) {
    dataObj.name = user.name;
    dataObj.user = user;
  } else if (visitor) {
    dataObj.name = visitor.integrations.marqeta.first_name;
    dataObj.visitor = visitor;
  } else {
    throw new Error('No user or visitor found, not sending pending documents email.');
  }

  if (inquiryTemplateId === PersonaInquiryTemplateIdEnum.GovIdAndSelfieAndDocs) {
    await createDeclinedKarmaWalletCardUserNotification(dataObj);
  } else if (inquiryTemplateId === PersonaInquiryTemplateIdEnum.GovIdAndSelfieOrDocs && inquiryStatus === PersonaInquiryStatusEnum.Failed) {
    await createDeclinedKarmaWalletCardUserNotification(dataObj);
  }
};

export const handleDeclinedFinalDecision = async (email: string, req: PersonaWebhookBody) => {
  const entityData = await returnUserOrVisitorFromEmail(email);
  const inquiryId = req?.data?.attributes?.payload?.data?.id;
  await closeMarqetaAccount(entityData);
  await fetchInquiryAndCreateOrUpdateIntegration(inquiryId, entityData.data);
};

export const handleInquiryTransitionedWebhook = async (req: PersonaWebhookBody) => {
  const inquiryStatus = req?.data?.attributes?.payload?.data?.attributes?.status;
  const inquiryId = req?.data?.attributes?.payload?.data?.id;
  const email = req?.data?.attributes?.payload?.data?.attributes?.fields?.applicationData?.value?.email;

  switch (inquiryStatus) {
    case PersonaInquiryStatusEnum.Completed:
      console.log('Inquiry completed');
      console.log('going into start or continue apply process for transitioned inquiry with id: ', inquiryId);
      await startOrContinueApplyProcessForTransitionedInquiry(req);
      await sendPendingEmail(email, req);
      break;
    case PersonaInquiryStatusEnum.Pending:
      console.log('Inquiry pending');
      // check if a visitor or user exists for this inquiry
      // update the integration if so, otherwise create a new visitor with a persona integration
      await createVisitorOrUpdatePersonaIntegration(email, req);
      break;
    case PersonaInquiryStatusEnum.Expired:
      console.log('Inquiry expired');
      break;
    case PersonaInquiryStatusEnum.Failed:
      console.log('Inquiry failed');
      console.log('going into start or continue apply process for transitioned inquiry with id: ', inquiryId);
      await sendPendingEmail(email, req);
      await startOrContinueApplyProcessForTransitionedInquiry(req);
      await sendContinueApplicationEmail(req);
      break;
    case PersonaInquiryStatusEnum.NeedsReview:
      console.log('Inquiry needs review');
      break;
    case PersonaInquiryStatusEnum.Approved:
      console.log('Inquiry approved');
      console.log('going into start or continue apply process for transitioned inquiry with id: ', inquiryId);
      await startOrContinueApplyProcessForTransitionedInquiry(req);
      break;
    case PersonaInquiryStatusEnum.Declined:
      console.log('Inquiry declined');
      console.log('going into start or continue apply process for transitioned inquiry with id: ', inquiryId);
      await handleDeclinedFinalDecision(email, req);
      // await startOrContinueApplyProcessForTransitionedInquiry(req);
      break;
    default:
      console.log(`Inquiry status not handled: ${inquiryStatus}`);
      break;
  }
};

export const handlePersonaWebhookByEventName = async (req: PersonaWebhookBody) => {
  switch (req?.data?.attributes?.name) {
    case EventNamesEnum.inquiryCreated:
      console.log('inquiry-created');
      break;
    case EventNamesEnum.inquiryFailed:
      console.log('inquiry-failed');
      break;
    case EventNamesEnum.inquiryExpired:
      console.log('inquiry-expired');
      break;
    case EventNamesEnum.inquiryStarted:
      console.log('inquiry-started');
      break;
    case EventNamesEnum.inquiryCompleted:
      console.log('inquiry-completed');
      break;
    case EventNamesEnum.inquiryApproved:
      console.log('inquiry-approved');
      break;
    case EventNamesEnum.inquiryMarkedForReview:
      console.log('inquiry-marked-for-review');
      break;
    case EventNamesEnum.inquiryDeclined:
      console.log('inquiry-declined');
      break;
    case EventNamesEnum.inquirySessionExpired:
      console.log('inquiry-session-expired');
      break;
    case EventNamesEnum.inquirySessionStarted:
      console.log('inquiry-session-started');
      break;
    case EventNamesEnum.inquiryTransitioned:
      console.log('inquiry-transitioned');
      await handleInquiryTransitionedWebhook(req);
      break;
    default:
      console.log(`Nothing to do for event with name: ${req.data.attributes.name}`);
      break;
  }
};
