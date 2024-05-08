/* eslint-disable import/no-cycle */
import dayjs from 'dayjs';
import { FilterQuery } from 'mongoose';
import { IMarqetaListKYCResponse, MarqetaReasonCodeEnum } from '../../clients/marqeta/types';
import { updateCustomFields } from '../../integrations/activecampaign';
import { createCard } from '../../integrations/marqeta/card';
import { listUserKyc, processUserKyc } from '../../integrations/marqeta/kyc';
import {
  IMarqetaCreateUser,
  IMarqetaKycResult,
  IMarqetaKycState,
  IMarqetaUserIntegrations,
  IMarqetaUserStatus,
} from '../../integrations/marqeta/types';
import { createMarqetaUser, getMarqetaUserByEmail, updateMarqetaUser, updateMarqetaUserStatus } from '../../integrations/marqeta/user';
import { fetchInquiryAndCreateOrUpdateIntegration, personaInquiryInSuccessState } from '../../integrations/persona';
import { ErrorTypes } from '../../lib/constants';
import { ActiveCampaignCustomFields } from '../../lib/constants/activecampaign';
import { NotificationChannelEnum, NotificationTypeEnum } from '../../lib/constants/notification';
import CustomError, { asCustomError } from '../../lib/customError';
import { getUtcDate } from '../../lib/date';
import { formatName, generateRandomPasswordString } from '../../lib/misc';
import {
  ApplicationStatus,
  IKarmaCardApplication,
  IKarmaCardApplicationDocument,
  IShareableCardApplication,
  KarmaCardApplicationModel,
} from '../../models/karmaCardApplication';
import { KarmaCardLegalModel } from '../../models/karmaCardLegal';
import { IUserDocument, UserModel } from '../../models/user';
import {
  IKarmaMembershipData,
  KarmaMembershipPaymentPlanEnumValues,
  KarmaMembershipStatusEnum,
  KarmaMembershipTypeEnumValues,
} from '../../models/user/types';
import { UserNotificationModel } from '../../models/user_notification';
import { IVisitorDocument, VisitorActionEnum, VisitorModel } from '../../models/visitor';
import { IRequest } from '../../types/request';
import * as UserService from '../user';
import { handleMarqetaUserActiveTransition, updateUserUrlParams } from '../user';
import { IUrlParam } from '../user/types';
import { createShareasaleTrackingId, isUserDocument } from '../user/utils';
import { createKarmaCardWelcomeUserNotification } from '../user_notification';
import * as VisitorService from '../visitor';
import {
  ApplicationDecision,
  hasKarmaWalletCards,
  openBrowserAndAddShareASaleCode,
  ReasonCode,
  SourceResponse,
  updateActiveCampaignDataAndJoinGroupForApplicant,
} from './utils';

export const { MARQETA_VIRTUAL_CARD_PRODUCT_TOKEN, MARQETA_PHYSICAL_CARD_PRODUCT_TOKEN } = process.env;

export interface IContinueKarmanCardApplicationRequestBody {
  email: string;
  personaInquiryId: string;
}

export interface IKarmaCardRequestBody {
  address1: string;
  address2?: string;
  birthDate: string;
  phone: string;
  city: string;
  email?: string;
  firstName: string;
  lastName: string;
  personaInquiryId: string;
  postalCode: string;
  ssn: string;
  state: string;
  urlParams?: IUrlParam[];
  sscid?: string;
  sscidCreatedOn?: string;
  xType?: string;
}

interface IApplySuccessData {
  email: string;
  firstName: string;
  lastName: string;
  urlParams?: IUrlParam[];
  visitorId?: string;
  postalCode: string;
}

export interface INewLegalTextRequestBody {
  text: string;
  name: string;
}
export interface IUpdateLegalTextRequestParams {
  legalTextId: string;
}

export type AddKarmaMembershipToUserRequest = {
  type: KarmaMembershipTypeEnumValues;
  paymentPlan: KarmaMembershipPaymentPlanEnumValues;
};

export const getShareableKarmaCardApplication = ({
  _id,
  userId,
  visitorId,
  userToken,
  firstName,
  lastName,
  email,
  address1,
  address2,
  birthDate,
  phone,
  city,
  postalCode,
  state,
  kycResult,
  status,
  lastModified,
}: IKarmaCardApplicationDocument): IShareableCardApplication & { _id: string } => ({
  _id,
  userId,
  visitorId,
  userToken,
  firstName,
  lastName,
  email,
  address1,
  address2,
  birthDate,
  phone,
  city,
  postalCode,
  state,
  kycResult,
  status,
  lastModified,
});

export const isUserKYCVerified = (kycResponse: IMarqetaListKYCResponse) => {
  if (kycResponse.data.length === 0) return false;
  const hasSuccessfulKYC = kycResponse.data.find((kyc: any) => kyc.result.status === IMarqetaKycState.success);
  return !!hasSuccessfulKYC;
};

export const isUserKYCVerifiedFromIntegration = (marqetaIntegration: IMarqetaUserIntegrations) => {
  const hasSuccessfulKYC = !!marqetaIntegration?.kycResult?.status && marqetaIntegration.kycResult.status === IMarqetaKycState.success;
  return marqetaIntegration.status === IMarqetaUserStatus.ACTIVE && hasSuccessfulKYC;
};

// This function expects the user to have a marqeta integration
export const performKycForUserOrVisitor = async (
  user: IUserDocument | IVisitorDocument,
): Promise<{ virtualCardResponse: any; physicalCardResponse: any }> => {
  if (!user?.integrations?.marqeta?.userToken) {
    console.error('User does not have marqeta integration or userToken. Cannot perform kyc.');
    return;
  }
  const marqetaIntegration = user.integrations.marqeta;
  // get the kyc list of a user
  let kycResponse = await listUserKyc(marqetaIntegration.userToken);

  // perform the kyc through marqeta & create the card
  if (!isUserKYCVerifiedFromIntegration(marqetaIntegration)) {
    kycResponse = await processUserKyc(marqetaIntegration.userToken);
    if (kycResponse?.result?.status === IMarqetaKycState.success) {
      const virtualCardResponse = await createCard({
        userToken: marqetaIntegration.userToken,
        cardProductToken: MARQETA_VIRTUAL_CARD_PRODUCT_TOKEN,
      });
      const physicalCardResponse = await createCard({
        userToken: marqetaIntegration.userToken,
        cardProductToken: MARQETA_PHYSICAL_CARD_PRODUCT_TOKEN,
      });
      return { virtualCardResponse, physicalCardResponse };
    }
  }
};

export const performKycAndSendWelcomeEmailForUser = async (user: IUserDocument) => {
  const { virtualCardResponse, physicalCardResponse } = await performKycForUserOrVisitor(user);
  if (!virtualCardResponse || !physicalCardResponse) {
    console.error(`Failed kyc or card creation for user: ${user._id}`);
    return;
  }

  try {
    // check if they've received the welcome email
    const welcomeNotification = await UserNotificationModel.findOne({
      user: user._id,
      type: NotificationTypeEnum.KarmaCardWelcome,
      channel: NotificationChannelEnum.Email,
    });

    if (!welcomeNotification) await createKarmaCardWelcomeUserNotification(user, false);
  } catch (err) {
    console.error(`Error sending welcome email for user: ${user._id}`);
  }
  return { virtualCardResponse, physicalCardResponse };
};

const performMarqetaCreateAndKYC = async (userData: IMarqetaCreateUser) => {
  // find the email is already register with marqeta or not
  const { data } = await getMarqetaUserByEmail({ email: userData.email });
  let userToken;
  let marqetaUserResponse;
  let kycResponse;

  if (data.length > 0) {
    // If existing user by email in Marqeta, update the user
    userToken = data[0].token;
    marqetaUserResponse = await updateMarqetaUser(userToken, userData);
  } else {
    // If not existing user, create a new one
    marqetaUserResponse = await createMarqetaUser(userData);
    userToken = marqetaUserResponse.token;
  }

  // get the kyc list of a user
  const existingKYCChecks = await listUserKyc(userToken);

  // perform the kyc through marqeta & create the card
  if (!isUserKYCVerified(existingKYCChecks)) {
    kycResponse = await processUserKyc(marqetaUserResponse.token);
  } else {
    kycResponse = existingKYCChecks.data.find((kyc: any) => kyc.result.status === IMarqetaKycState.success);
  }

  return { marqetaUserResponse, kycResponse };
};

const storeKarmaCardApplication = async (cardApplicationData: IKarmaCardApplication) => {
  // find and update the user application for karma card ,aka Marqeta card
  await KarmaCardApplicationModel.findOneAndUpdate({ visitorId: cardApplicationData.visitorId }, cardApplicationData, {
    upsert: true,
    new: true,
  });
};

export const _getKarmaCardApplications = async (query: FilterQuery<IKarmaCardApplication>) => KarmaCardApplicationModel.find(query).sort({ lastModified: -1 });

export const getKarmaCardApplications = async () => _getKarmaCardApplications({});

export const handleExistingUserApplySuccess = async (userObject: IUserDocument, urlParams?: IUrlParam[]) => {
  const userEmail = userObject.emails.find((email) => !!email.primary).email;
  if (!!urlParams) {
    await updateUserUrlParams(userObject, urlParams);
    await updateActiveCampaignDataAndJoinGroupForApplicant(userObject, urlParams);
  } else {
    await updateActiveCampaignDataAndJoinGroupForApplicant(userObject);
  }
  // add existingUser flag to active campaign
  await updateCustomFields(userEmail, [{ field: ActiveCampaignCustomFields.existingWebAppUser, update: 'true' }]);
  await createKarmaCardWelcomeUserNotification(userObject, false);
};

export const handleKarmaCardApplySuccess = async ({
  email,
  firstName,
  lastName,
  urlParams,
  visitorId,
  postalCode,
}: IApplySuccessData): Promise<IUserDocument> => {
  // find the user again since there is a potential race condition
  let userObject = await UserModel.findOne({ 'emails.email': email });
  // EXISTING USER
  if (!!userObject) {
    await handleExistingUserApplySuccess(userObject, urlParams);
    userObject.name = `${firstName} ${lastName}`;
    userObject.zipcode = postalCode;
  }

  // NEW USER
  if (!userObject) {
    // if there is no existing user, create a new user based on the visitor you created before KYC/Marqeta
    // add the marqeta integration to the newly created user or the existing user (userObject)
    const { user } = await UserService.register({
      name: `${firstName} ${lastName}`,
      password: generateRandomPasswordString(14),
      visitorId,
      isAutoGenerated: true,
    });

    userObject = user;
  }

  await updateMarqetaUserStatus(userObject, IMarqetaUserStatus.ACTIVE, MarqetaReasonCodeEnum.RequestedByYou);
  // store the karma card application log
  await userObject.save();
  return userObject;
};

export const storeApplicationAndHandleSuccesState = async (
  karmaCardApplication: IKarmaCardApplication,
  entity: IUserDocument | IVisitorDocument,
): Promise<SourceResponse> => {
  if (!entity) return;

  const entityIsUser = isUserDocument(entity);
  // PASSED KYC
  const successData: IApplySuccessData = {
    email: entity.integrations?.marqeta?.email,
    firstName: entity.integrations?.marqeta?.first_name,
    lastName: entity.integrations?.marqeta?.last_name,
    visitorId: entityIsUser ? '' : entity?._id,
    postalCode: entity.integrations?.marqeta?.postal_code,
  };

  successData.urlParams = entityIsUser ? entity.integrations?.referrals?.params : entity.integrations?.urlParams;

  let userDocument = await handleKarmaCardApplySuccess(successData);

  karmaCardApplication.status = ApplicationStatus.SUCCESS;
  karmaCardApplication.kycResult = {
    status: IMarqetaKycState.success,
    codes: [],
  };

  karmaCardApplication.userId = userDocument._id.toString();
  userDocument.integrations.marqeta.status = IMarqetaUserStatus.ACTIVE;

  const sscid = entityIsUser ? entity.integrations.shareasale?.sscid : entity.integrations.shareASale?.sscid;
  const sscidCreatedOn = entityIsUser ? entity.integrations.shareasale?.sscidCreatedOn : entity.integrations.shareASale?.sscidCreatedOn;
  const xType = entityIsUser ? entity.integrations.shareasale?.xTypeParam : entity.integrations.shareASale?.xTypeParam;

  if (!!sscid && !!sscidCreatedOn && !!xType) {
    const trackingId = await createShareasaleTrackingId();
    userDocument.integrations.shareasale = {
      sscid,
      sscidCreatedOn,
      xTypeParam: xType,
      trackingId,
    };
    await openBrowserAndAddShareASaleCode({ sscid, trackingid: trackingId, xtype: xType, sscidCreatedOn });
  }

  userDocument = await userDocument.save();
  await storeKarmaCardApplication(karmaCardApplication);
  await handleMarqetaUserActiveTransition(userDocument, !entityIsUser);
  return userDocument?.toObject()?.integrations?.marqeta as SourceResponse;
};

export const updateEntityKycResult = async (entity: IUserDocument | IVisitorDocument, kycResult: IMarqetaKycResult) => {
  entity.integrations.marqeta.kycResult = kycResult;
  const newEntity = await entity.save();
  return newEntity;
};

export const continueKarmaCardApplication = async (email: string, personaInquiryId: string): Promise<ApplicationDecision> => {
  try {
    // pull visitor or email from the db
    const user = await UserModel.findOne({ 'emails.email': email });
    const visitor = await VisitorModel.findOne({ email });
    if (!user && !visitor) throw new CustomError(`No user or visitor find with email: ${email}`, ErrorTypes.NOT_FOUND);

    // find the application for the user or visitor
    let application: IKarmaCardApplication;
    let kycResult;

    if (user) {
      application = await KarmaCardApplicationModel.findOne({ userId: user?._id });
      kycResult = user?.integrations?.marqeta?.kycResult;
    } else {
      application = await KarmaCardApplicationModel.findOne({ visitorId: visitor?._id });
      kycResult = visitor?.integrations?.marqeta?.kycResult;
    }

    if (!application) throw new CustomError('No application found for the user or visitor', ErrorTypes.NOT_FOUND);
    if (!kycResult) throw new CustomError('No kyc result found for the user or visitor', ErrorTypes.NOT_FOUND);

    // pull the persona inquiry
    const inquiryResult = await fetchInquiryAndCreateOrUpdateIntegration(personaInquiryId, user || visitor);

    // check to see if they have already been approved, if so return early
    if (application.status === ApplicationStatus.SUCCESS) {
      const marqetaIntegration = !!user ? user.integrations.marqeta : visitor.integrations.marqeta;
      return { ...(marqetaIntegration as SourceResponse), internalKycTemplateId: inquiryResult?.templateId };
    }

    // check that failed internal kyc was the only failure reason
    // if not, return the application with the status of the inquiry
    if (
      kycResult?.codes?.length >= 1
      && (!kycResult?.codes?.includes(ReasonCode.Approved) || !kycResult?.codes?.includes(ReasonCode.FailedInternalKyc))
    ) {
      const marqetaIntegration = !!user ? user.integrations.marqeta : visitor.integrations.marqeta;
      return { ...(marqetaIntegration as unknown as SourceResponse), internalKycTemplateId: inquiryResult?.templateId };
    }

    // update kyc based on if
    if (!personaInquiryInSuccessState(inquiryResult)) {
      if (!kycResult?.codes?.includes(ReasonCode.FailedInternalKyc)) {
        if (!kycResult?.codes) kycResult.codes = [];
        kycResult.codes.push(ReasonCode.FailedInternalKyc);
      }
      // we aren't using the nuewly updated user/visitor, so marqeta integration would still be the whole status,
      const updatedEntity = await updateEntityKycResult(user || visitor, kycResult);
      const marqetaIntegration = updatedEntity.integrations.marqeta;
      /// looks like we are returning the marqeta  integration here and not what we just updated since kycResult is defined in here?
      return {
        ...(marqetaIntegration as unknown as SourceResponse),
        internalKycTemplateId: inquiryResult?.templateId,
      };
    }

    return {
      ...((await storeApplicationAndHandleSuccesState(application, user || visitor)) as unknown as SourceResponse),
      internalKycTemplateId: inquiryResult?.templateId,
    };
  } catch (err) {
    console.log(`Error in continueKarmaCardApplication: ${err}`);
    if ((err as CustomError)?.isCustomError) {
      throw err;
    }
    throw new CustomError('Error continuing application', ErrorTypes.SERVER);
  }
};

export const getApplicationStatus = async (email: string): Promise<ApplicationDecision> => {
  try {
    const user = await UserModel.findOne({ 'emails.email': email }).lean();
    const visitor = await VisitorModel.findOne({ email }).lean();
    if (!user && !visitor) throw new CustomError(`No user or visitor found with email: ${email}`, ErrorTypes.NOT_FOUND);
    if (!!user) {
      const latestInquiryIndex = !!user.integrations?.persona?.inquiries?.length ? user.integrations.persona.inquiries.length - 1 : 0;
      const latestInquiry = user.integrations?.persona?.inquiries?.[latestInquiryIndex >= 1 ? latestInquiryIndex : 0];
      return { ...(user.integrations.marqeta as unknown as SourceResponse), internalKycTemplateId: latestInquiry?.templateId };
    }
    if (!!visitor) {
      const latestInquiryIndex = !!visitor.integrations?.persona?.inquiries?.length ? visitor.integrations.persona.inquiries.length - 1 : 0;
      const latestInquiry = visitor.integrations?.persona?.inquiries?.[latestInquiryIndex >= 1 ? latestInquiryIndex : 0];
      return { ...(visitor.integrations.marqeta as unknown as SourceResponse), internalKycTemplateId: latestInquiry?.templateId };
    }
  } catch (err) {
    if ((err as CustomError)?.isCustomError) {
      throw err;
    }
    throw new CustomError('Error getting application status', ErrorTypes.SERVER);
  }
};

export const applyForKarmaCard = async (req: IRequest<{}, {}, IKarmaCardRequestBody>): Promise<ApplicationDecision> => {
  console.log('////// init apply for card');
  let _visitor;
  let { requestor } = req;
  let { firstName, lastName, email } = req.body;
  const { address1, address2, birthDate, phone, postalCode, state, ssn, city, urlParams, sscid, sscidCreatedOn, xType, personaInquiryId } = req.body;

  if (!firstName || !lastName || !address1 || !birthDate || !phone || !postalCode || !state || !ssn || !city) {
    throw new Error('Missing required fields');
  }

  if (!requestor && !email) throw new Error('Missing required fields');

  if (!!requestor && requestor.emails.find((e) => !!e.primary).email !== email) {
    requestor = null;
  }

  firstName = formatName(firstName);
  lastName = formatName(lastName);
  email = email.toLowerCase();

  const existingVisitor = await VisitorModel.findOne({ email });
  const existingUser = (await UserModel.findOne({ 'emails.email': email })) as IUserDocument;
  // if an applicant is using an email that belongs to a user
  if (!requestor && existingUser) throw new Error('Email already registered with Karma Wallet account. Please sign in to continue.');

  // if they are an existing visitor but not an existing user (could have applied previously)
  if (!!existingVisitor && !existingUser) _visitor = existingVisitor;

  // EXISTING USER WITH KARMA WALLET CARDS SHOULD NOT BE ABLE TO APPLY, FRONTEND SHOULD HAVE ALSO CHECKED THIS
  if (!!existingUser) {
    const hasKarmaCards = await hasKarmaWalletCards(existingUser);
    if (!!hasKarmaCards) {
      const applyResponse = {
        kycResult: {
          status: IMarqetaKycState.failure,
          codes: [ReasonCode.Already_Registered],
        },
      };
      return applyResponse;
    }
  }

  // CREATE A NEW VISITOR IF THERE IS NO VISITOR OR USER FOR THE APPLICANT
  // if the visitor passes KYC, we will create a user for them based on the visitor data later in this function
  if (!existingVisitor && !existingUser) {
    const visitorData: any = {
      email,
    };

    if (!!urlParams) {
      visitorData.params = urlParams;
      const groupCode = urlParams.find((param) => param.key === 'groupCode');
      if (!!groupCode) {
        visitorData.groupCode = urlParams.find((param) => param.key === 'groupCode')?.value;
      }
    }

    if (!!sscid && !!sscidCreatedOn && !!xType) {
      visitorData.sscid = sscid;
      visitorData.sscidCreatedOn = sscidCreatedOn;
      visitorData.xTypeParam = xType;
    }

    const newVisitorResponse = await VisitorService.createCreateAccountVisitor(visitorData);
    _visitor = newVisitorResponse;
  }

  // pull the persona inquiry data
  const inquiryResult = await fetchInquiryAndCreateOrUpdateIntegration(personaInquiryId, existingUser || _visitor);

  // MARQETA KYC: Prepare Data to create a User in Marqeta and submit for Marqeta KYC
  const marqetaKYCInfo: IMarqetaCreateUser = {
    firstName,
    lastName,
    address1,
    birthDate,
    phone,
    postalCode,
    state,
    // hard coded to the US for all applications for now
    country: 'US',
    city,
    email,
    identifications: [
      {
        type: 'SSN',
        value: ssn,
      },
    ],
  };

  if (address2) marqetaKYCInfo.address2 = address2;

  // MARQETA KYC/CREATE USER
  const { marqetaUserResponse, kycResponse } = await performMarqetaCreateAndKYC(marqetaKYCInfo);

  // get the kyc result code
  let { status } = kycResponse.result;
  const { codes } = kycResponse.result;
  let kycErrorCodes = codes?.map((item: any) => item.code);

  // check the status of the persona inquiry
  const failedPersonaInquiry = !personaInquiryInSuccessState(inquiryResult);
  if (failedPersonaInquiry) {
    status = IMarqetaKycState.failure;
    kycErrorCodes = !!kycErrorCodes ? [...kycErrorCodes, ReasonCode.FailedInternalKyc] : [ReasonCode.FailedInternalKyc];
  }

  const marqeta = {
    userToken: marqetaUserResponse.token,
    kycResult: { status, codes: kycErrorCodes },
    email,
    internalKycTemplateId: inquiryResult?.templateId,
    ...marqetaUserResponse,
  };

  const kycStatus = status;

  if (!existingUser) {
    console.log('///// should create a visitor', _visitor, marqeta);
    // Update the visitors marqeta Kyc status
    _visitor = await VisitorService.updateCreateAccountVisitor(_visitor, {
      marqeta,
      email,
      params: urlParams,
      sscid,
      sscidCreatedOn,
      xTypeParam: xType,
      actions: [{ type: VisitorActionEnum.AppliedForCard, createdOn: getUtcDate().toDate() }],
    });
  } else {
    // Update the existing user
    // Is it ok to overwrite the shareasale data if it already exists?
    if (!existingUser.integrations) existingUser.integrations = {};

    if (!!sscid) existingUser.integrations.shareasale = { sscid, sscidCreatedOn, xTypeParam: xType };
    existingUser.integrations.marqeta = marqeta;
    // TODO: store group code
    if (!!urlParams) await updateUserUrlParams(existingUser, urlParams);
    await existingUser.save();
  }

  const karmaCardApplication: IKarmaCardApplication = {
    userToken: marqetaUserResponse?.userToken,
    firstName,
    lastName,
    email,
    address1,
    address2,
    birthDate,
    phone,
    city,
    postalCode,
    state,
    status: ApplicationStatus.FAILED,
    kycResult: {
      status,
      codes: kycErrorCodes,
    },
    lastModified: dayjs().utc().toDate(),
  };

  // FAILED OR PENDING KYC, already saved to user or visitor object
  if (kycStatus !== IMarqetaKycState.success) {
    if (!!existingUser) {
      karmaCardApplication.userId = existingUser._id.toString();
    } else {
      karmaCardApplication.visitorId = _visitor._id;
      const newData: VisitorService.ICreateAccountRequest = {
        marqeta,
        email,
        actions: [{ type: VisitorActionEnum.ApplicationDeclined, createdOn: getUtcDate().toDate() }],
      };
      if (!!urlParams) newData.params = urlParams;
      _visitor = await VisitorService.updateCreateAccountVisitor(_visitor, newData);
    }

    // set this marqeta user's status to suspended because they failed KYC
    await updateMarqetaUserStatus(!!existingUser ? existingUser : _visitor, IMarqetaUserStatus.SUSPENDED, MarqetaReasonCodeEnum.AccountUnderReview);
    await storeKarmaCardApplication(karmaCardApplication);
    return marqeta;
  }

  return {
    ...(await storeApplicationAndHandleSuccesState(karmaCardApplication, existingUser || _visitor)),
    internalKycTemplateId: inquiryResult?.templateId,
  };
};

export const getKarmaCardLegalText = async (_req: IRequest) => {
  const legalTexts = await KarmaCardLegalModel.find();
  if (!legalTexts.length) throw new CustomError('There are no legal texts available', ErrorTypes.NOT_FOUND);
  return legalTexts;
};

export const createKarmaCardLegalText = async (req: IRequest<{}, {}, INewLegalTextRequestBody>) => {
  const { text, name } = req.body;

  if (!text) throw new CustomError('Text is required.', ErrorTypes.INVALID_ARG);
  if (!name) throw new CustomError('Name is required.', ErrorTypes.INVALID_ARG);

  try {
    const legalText = new KarmaCardLegalModel({
      text,
      name,
    });

    legalText.save();
    return legalText;
  } catch (err) {
    throw asCustomError(err);
  }
};

export const updateKarmaCardLegalText = async (req: IRequest<IUpdateLegalTextRequestParams, {}, INewLegalTextRequestBody>) => {
  const { text } = req.body;

  if (!text) throw new CustomError('Text is required.', ErrorTypes.INVALID_ARG);

  try {
    const legalText = await KarmaCardLegalModel.findOne({ _id: req.params.legalTextId });
    if (!legalText) throw new CustomError(`Legal text with id "${req.params.legalTextId}" not found`, ErrorTypes.NOT_FOUND);

    legalText.text = text;
    legalText.lastModified = new Date();

    legalText.save();
    return legalText;
  } catch (err) {
    throw asCustomError(err);
  }
};

export const deleteKarmaCardLegalText = async (req: IRequest<IUpdateLegalTextRequestParams, {}, {}>) => {
  try {
    const legalText = await KarmaCardLegalModel.findOne({ _id: req.params.legalTextId });
    if (!legalText) throw new CustomError(`Legal text with id "${req.params.legalTextId}" not found`, ErrorTypes.NOT_FOUND);

    const legalTextDeleted = await legalText.remove();
    return legalTextDeleted;
  } catch (err) {
    throw asCustomError(err);
  }
};

export const addKarmaMembershipToUser = async (
  user: IUserDocument,
  membershipType: KarmaMembershipTypeEnumValues,
  paymentPlan: KarmaMembershipPaymentPlanEnumValues,
) => {
  try {
    const existingMembership = user.karmaMemberships?.find(
      (membership) => membership.type === membershipType && membership.status === KarmaMembershipStatusEnum.active,
    );
    if (!!existingMembership) throw new CustomError('User already has an active membership of this type', ErrorTypes.CONFLICT);

    const existingActiveMembership = user.karmaMemberships?.find((membership) => membership.status === KarmaMembershipStatusEnum.active);
    if (!!existingActiveMembership) {
      existingActiveMembership.status = 'cancelled';
      existingActiveMembership.cancelledOn = getUtcDate().toDate();
    }

    const newMembership: IKarmaMembershipData = {
      type: membershipType,
      status: KarmaMembershipStatusEnum.active,
      paymentPlan,
      lastModified: getUtcDate().toDate(),
      startDate: getUtcDate().toDate(),
    };

    if (!user.karmaMemberships) user.karmaMemberships = [];
    user.karmaMemberships.push(newMembership);
    return user.save();
  } catch (err) {
    console.error(
      `Error subscribing user to karma membership ${membershipType} using ${paymentPlan} payment plan for user ${user._id} : ${err}`,
    );
    if ((err as CustomError)?.isCustomError) {
      throw err;
    }
    throw new CustomError('Error subscribing user to karma membership', ErrorTypes.SERVER);
  }
};

export const updateKarmaMembershipPaymentPlan = async (user: IUserDocument, paymentPlan: KarmaMembershipPaymentPlanEnumValues) => {
  try {
    const existingMembership = user.karmaMemberships?.find((membership) => membership.status === KarmaMembershipStatusEnum.active);
    if (!existingMembership) throw new CustomError('User does not have an active membership to update', ErrorTypes.NOT_FOUND);
    if (existingMembership.paymentPlan === paymentPlan) throw new CustomError('User already has this payment plan', ErrorTypes.CONFLICT);

    existingMembership.paymentPlan = paymentPlan;
    existingMembership.lastModified = getUtcDate().toDate();
    return user.save();
  } catch (err) {
    console.error(`Error updating to ${paymentPlan} for user ${user._id}: ${err}`);
    if ((err as CustomError)?.isCustomError) {
      throw err;
    }
    throw new CustomError('Error updating karma membership payment plan', ErrorTypes.SERVER);
  }
};

export const cancelKarmaMembership = async (user: IUserDocument, membershipType: KarmaMembershipTypeEnumValues) => {
  try {
    const existingMembership = user.karmaMemberships?.find(
      (membership) => membership.type === membershipType && membership.status === KarmaMembershipStatusEnum.active,
    );
    if (!existingMembership) throw new CustomError('User does not have an active membership to cancel', ErrorTypes.NOT_FOUND);

    existingMembership.status = KarmaMembershipStatusEnum.cancelled;
    existingMembership.lastModified = getUtcDate().toDate();
    existingMembership.cancelledOn = getUtcDate().toDate();
    return user.save();
  } catch (err) {
    console.error(`Error cancelling ${membershipType} membership for user ${user._id}: ${err}`);
    if ((err as CustomError)?.isCustomError) {
      throw err;
    }
    throw new CustomError('Error cancelling karma membership', ErrorTypes.SERVER);
  }
};
