import { createOrUpdatePersonaIntegration } from '.';
import { MarqetaKYCStatus } from '../../clients/marqeta/types';
import { states, SocketEvents } from '../../lib/constants';
import { SocketRooms, SocketEventTypes } from '../../lib/constants/sockets';
import { getUtcDate } from '../../lib/date';
import { KarmaCardApplicationModel, ApplicationStatus } from '../../models/karmaCardApplication';
import { UserModel, IUserDocument } from '../../models/user';
import { VisitorModel, VisitorActionEnum } from '../../models/visitor';
import { ApplicationDecision, getShareableMarqetaUser } from '../../services/karmaCard/utils';
import { SocketClient } from '../../clients/socket';
import { IRequest } from '../../types/request';
import { PersonaWebhookBody, PersonaInquiryTemplateIdEnum, PersonaInquiryStatusEnum, EventNamesEnum } from './types';
import { IKarmaCardRequestBody, applyForKarmaCard, getApplicationStatus, continueKarmaCardApplication } from '../../services/karmaCard';

export const startApplicationFromInquiry = async (req: PersonaWebhookBody): Promise<ApplicationDecision> => {
  // start the application process
  const inquiryData = req?.data?.attributes?.payload?.data?.attributes;
  const applicationData = req?.data?.attributes?.payload?.data?.attributes.fields?.applicationData?.value;
  const applicationBody: IKarmaCardRequestBody = {
    address1: inquiryData?.addressStreet1?.trim(),
    address2: inquiryData?.addressStreet2?.trim(),
    birthDate: inquiryData?.birthdate,
    phone: inquiryData?.phoneNumber?.trim(),
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
    if ((kycStatus === MarqetaKYCStatus.SUCCESS) || (!!application && application?.status === ApplicationStatus.SUCCESS)) {
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
    if (!!application && !!applicationStatus?.kycResult?.status && inquiryTemplateId === PersonaInquiryTemplateIdEnum.GovIdAndSelfieOrDocs) {
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

export const handleInquiryTransitionedWebhook = async (req: PersonaWebhookBody) => {
  const inquiryStatus = req?.data?.attributes?.payload?.data?.attributes?.status;
  const inquiryId = req?.data?.attributes?.payload?.data?.id;
  const email = req?.data?.attributes?.payload?.data?.attributes?.fields?.applicationData?.value?.email;
  switch (inquiryStatus) {
    case PersonaInquiryStatusEnum.Completed:
      console.log('Inquiry completed');
      console.log('going into start or continue apply process for transitioned inquiry with id: ', inquiryId);
      await startOrContinueApplyProcessForTransitionedInquiry(req);
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
      await startOrContinueApplyProcessForTransitionedInquiry(req);
      break;
    case PersonaInquiryStatusEnum.NeedsReview:
      console.log('Inquiry needs review');
      break;
    case PersonaInquiryStatusEnum.Approved:
      console.log('Inquiry approved');
      break;
    case PersonaInquiryStatusEnum.Declined:
      console.log('Inquiry declined');
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
