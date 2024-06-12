/* eslint-disable import/no-cycle */
import dayjs from 'dayjs';
import { FilterQuery } from 'mongoose';
import { IMarqetaListKYCResponse, MarqetaReasonCodeEnum } from '../../clients/marqeta/types';
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
import { fetchCaseAndCreateOrUpdateIntegration, fetchInquiryAndCreateOrUpdateIntegration, personaCaseInSuccessState, personaInquiryInSuccessState } from '../../integrations/persona';
import { ErrorTypes } from '../../lib/constants';
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
  KarmaMembershipStatusEnum,
} from '../../models/user/types';
import { IVisitorDocument, VisitorActionEnum, VisitorModel } from '../../models/visitor';
import { IRequest } from '../../types/request';
import * as UserService from '../user';
import { updateUserUrlParams } from '../user';
import { IUrlParam } from '../user/types';
import { addKarmaMembershipToUser, createShareasaleTrackingId, isUserDocument } from '../user/utils';
import { createKarmaCardWelcomeUserNotification } from '../user_notification';
import * as VisitorService from '../visitor';
import {
  openBrowserAndAddShareASaleCode,
  ReasonCode,
  ApplicationDecision,
  updateActiveCampaignDataAndJoinGroupForApplicant,
} from './utils';
import { createKarmaCardMembershipCustomerSession } from '../../integrations/stripe/checkout';
import { createStripeCustomerAndAddToUser } from '../../integrations/stripe/customer';
import { createUserProductSubscription } from '../userProductSubscription';
import { UserProductSubscriptionStatus } from '../../models/userProductSubscription/types';
import { ProductSubscriptionModel } from '../../models/productSubscription';
import { ActiveCampaignCustomFields } from '../../lib/constants/activecampaign';
import { updateCustomFields } from '../../integrations/activecampaign';
import { ICreateAccountRequest } from '../visitor';
import { userHasActiveOrSuspendedDepositAccount } from '../depositAccount';
import { StandardKarmaWalletSubscriptionId } from '../productSubscription';

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
  productSubscriptionId?: string;
}

export interface INewLegalTextRequestBody {
  text: string;
  name: string;
}
export interface IUpdateLegalTextRequestParams {
  legalTextId: string;
}

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
  console.log('////// this is the kyc response', kycResponse);
  if (kycResponse?.data.length === 0) return false;
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
    kycResponse = existingKYCChecks?.data.find((kyc: any) => kyc?.result?.status === IMarqetaKycState.success);
    if (!kycResponse) {
      kycResponse = await processUserKyc(marqetaUserResponse.token);
    }
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
  console.log('//// handle existing user apply success');
  const userEmail = userObject.emails.find((email) => !!email.primary).email;
  try {
    if (!!urlParams) {
      await updateUserUrlParams(userObject, urlParams);
      await updateActiveCampaignDataAndJoinGroupForApplicant(userObject, urlParams);
    } else {
      await updateActiveCampaignDataAndJoinGroupForApplicant(userObject);
    }

    // add existingUser flag to active campaign
    await updateCustomFields(userEmail, [{ field: ActiveCampaignCustomFields.existingWebAppUser, update: 'true' }]);
    console.log('//// send welcome email, handleExistingUserApplySuccess');
    await createKarmaCardWelcomeUserNotification(userObject, false);
  } catch (err) {
    console.error(`Error updating user ${userObject._id} with urlParams: ${urlParams} to success state: ${err}`);
  }
};

export const createUserProductSubscriptionAndPaymentLink = async (userObject: IUserDocument) => {
  try {
  // create a customer in stripe
    const customer = await createStripeCustomerAndAddToUser(userObject);
    if (!customer) throw new Error('Error creating Stripe customer');
    // create a customer checkout session
    const session = await createKarmaCardMembershipCustomerSession(userObject);
    const productSubscription = await ProductSubscriptionModel.findOne({ name: 'Standard Karma Wallet Membership' });
    await createUserProductSubscription({
      user: userObject._id,
      productSubscription,
      status: UserProductSubscriptionStatus.UNPAID,
    });

    return session.url;
  } catch (err) {
    throw new Error(`Error creating Stripe Payment Link: ${err}`);
  }
};

// UPON SUCCESSFUL KYC IN PERSONA AND MARQETA UPDATE THE USER OR CREATE A USER
export const updateVisitorOrUserOnApproved = async (
  entity: IUserDocument | IVisitorDocument,
): Promise<IUserDocument> => {
  const entityIsUser = isUserDocument(entity);
  const email = entity?.integrations?.marqeta?.email;
  const firstName = entity?.integrations?.marqeta?.first_name;
  const lastName = entity?.integrations?.marqeta?.last_name;
  const visitorId = entityIsUser ? '' : entity?._id;
  const postalCode = entity?.integrations?.marqeta?.postal_code;
  const urlParams = entityIsUser ? entity.integrations?.referrals?.params : entity.integrations?.urlParams;
  // find the user again since there is a potential race condition
  let userObject = await UserModel.findOne({ 'emails.email': email });

  if (!!userObject) {
    // EXISTING USER
    await updateUserUrlParams(userObject, urlParams);
    userObject.name = `${firstName} ${lastName}`;
    userObject.zipcode = postalCode;
  } else {
    // NEW USER
    const { user } = await UserService.register({
      name: `${firstName} ${lastName}`,
      password: generateRandomPasswordString(14),
      visitorId,
      isAutoGenerated: true,
    });

    userObject = user;
  }

  // TRANSITION USER TO SUSPENDED IN MARQETA
  await updateMarqetaUserStatus(userObject, IMarqetaUserStatus.SUSPENDED, MarqetaReasonCodeEnum.RequestedByYou);
  userObject.integrations.marqeta.status = IMarqetaUserStatus.SUSPENDED;

  const sscid = entityIsUser ? entity.integrations.shareasale?.sscid : entity.integrations.shareASale?.sscid;
  const sscidCreatedOn = entityIsUser ? entity.integrations.shareasale?.sscidCreatedOn : entity.integrations.shareASale?.sscidCreatedOn;
  const xType = entityIsUser ? entity.integrations.shareasale?.xTypeParam : entity.integrations.shareASale?.xTypeParam;

  if (!!sscid && !!sscidCreatedOn && !!xType) {
    const trackingId = await createShareasaleTrackingId();
    userObject.integrations.shareasale = {
      sscid,
      sscidCreatedOn,
      xTypeParam: xType,
      trackingId,
    };
    await openBrowserAndAddShareASaleCode({ sscid, trackingid: trackingId, xtype: xType, sscidCreatedOn });
  }

  userObject = await userObject.save();
  return userObject;
};

export const updateKarmaCardApplicationFromApproved = async (
  karmaCardApplication: IKarmaCardApplication,
  userId: string,
) => {
  karmaCardApplication.status = ApplicationStatus.SUCCESS;
  karmaCardApplication.kycResult = {
    status: IMarqetaKycState.success,
    codes: [],
  };
  karmaCardApplication.userId = userId;

  await storeKarmaCardApplication(karmaCardApplication);
};

export const handleApprovedState = async (
  karmaCardApplication: IKarmaCardApplication,
  entity: IUserDocument | IVisitorDocument,
): Promise<IUserDocument> => {
  if (!entity) return;
  const userObject = await updateVisitorOrUserOnApproved(entity);
  await updateKarmaCardApplicationFromApproved(karmaCardApplication, userObject._id.toString());
  const standardSubscription = await ProductSubscriptionModel.findOne({ _id: StandardKarmaWalletSubscriptionId });
  await addKarmaMembershipToUser(userObject, standardSubscription, KarmaMembershipStatusEnum.unpaid);
  return userObject;
};

export const updateEntityKycResult = async (entity: IUserDocument | IVisitorDocument, kycResult: IMarqetaKycResult) => {
  entity.integrations.marqeta.kycResult = kycResult;
  const newEntity = await entity.save();
  return newEntity;
};

// expects case id or inquiry id
export const continueKarmaCardApplication = async (email: string, inquiryId?: string, caseId?: string): Promise<ApplicationDecision> => {
  if (!inquiryId && !caseId) throw new CustomError('Missing required fields', ErrorTypes.INVALID_ARG);
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
    let userPassedInternalKyc = false;
    let templateId;

    if (!!inquiryId) {
      const { newInquiry: internalKycResult, integration: _ } = await fetchInquiryAndCreateOrUpdateIntegration(inquiryId, user || visitor);
      userPassedInternalKyc = personaInquiryInSuccessState(internalKycResult);
      templateId = internalKycResult?.templateId;
    } else {
      const { newCase: internalKycResult, integration: _ } = await fetchCaseAndCreateOrUpdateIntegration(caseId, user || visitor);
      userPassedInternalKyc = personaCaseInSuccessState(internalKycResult);
    }

    const entity = user || visitor;
    const marqetaIntegration = entity.integrations.marqeta;
    const personaIntegration = entity.integrations.persona;

    // check to see if they have already been approved, if so return early
    if (application.status === ApplicationStatus.SUCCESS) {
      return { marqeta: marqetaIntegration, persona: personaIntegration, internalKycTemplateId: templateId };
    }

    // check that failed internal kyc was the only failure reason
    // if not, return the application with the status of the inquiry
    if (
      kycResult?.codes?.length >= 1
      && !kycResult?.codes?.includes(ReasonCode.Approved)
    ) {
      return { marqeta: marqetaIntegration, persona: personaIntegration, internalKycTemplateId: templateId };
    }

    if (!userPassedInternalKyc) {
      // we aren't using the newly updated user/visitor, so marqeta integration would still be the whole status,
      const updatedEntity = await updateEntityKycResult(entity, kycResult);
      const { marqeta, persona } = updatedEntity.integrations;

      return {
        marqeta,
        persona,
        internalKycTemplateId: templateId,
      };
    }

    // User has passed marqeta and persona
    const marqeta = await handleApprovedState(application, user || visitor);

    return {
      marqeta,
      persona: personaIntegration,
      internalKycTemplateId: templateId,
    };
  } catch (err) {
    console.log(`Error in continueKarmaCardApplication: ${err}`);
    if ((err as CustomError)?.isCustomError) {
      throw err;
    }
    throw new CustomError('Error continuing application', ErrorTypes.SERVER);
  }
};

export const getApplicationData = async (email: string): Promise<ApplicationDecision> => {
  try {
    const user = await UserModel.findOne({ 'emails.email': email }).lean();
    const visitor = await VisitorModel.findOne({ email }).lean();
    if (!user && !visitor) throw new CustomError(`No user or visitor found with email: ${email}`, ErrorTypes.NOT_FOUND);
    const entity = user || visitor;

    const latestInquiryIndex = !!entity?.integrations?.persona?.inquiries?.length ? entity.integrations.persona.inquiries.length - 1 : 0;
    const latestInquiry = entity?.integrations?.persona?.inquiries?.[latestInquiryIndex >= 1 ? latestInquiryIndex : 0];
    return {
      marqeta: entity?.integrations?.marqeta,
      persona: entity?.integrations?.persona,
      internalKycTemplateId: latestInquiry?.templateId,
    };
  } catch (err) {
    if ((err as CustomError)?.isCustomError) {
      throw err;
    }
    throw new CustomError('Error getting application status', ErrorTypes.SERVER);
  }
};

const _checkIfValidApplyForKarmaCard = (req: IRequest<{}, {}, IKarmaCardRequestBody>) => {
  const { body, requestor } = req;
  const { email, firstName, lastName, address1, birthDate, phone, postalCode, state, ssn, city } = body;
  if (firstName || lastName || address1 || birthDate || phone || postalCode || state || ssn || city) {
    throw new CustomError('Missing required fields', ErrorTypes.INVALID_ARG);
  }

  if (!requestor && !email) throw new Error('Missing required fields');
};

export const _createNewVisitorFromApply = async (
  email: string,
  urlParams: IUrlParam[],
  sscid: string,
  sscidCreatedOn: string,
  xType: string,
) => {
  const visitorData: ICreateAccountRequest = { email };

  if (!!urlParams) {
    visitorData.params = urlParams;
    const groupCode = urlParams.find((param) => param.key === 'groupCode');
    if (!!groupCode) {
      visitorData.groupCode = groupCode?.value;
    }
  }

  if (!!sscid && !!sscidCreatedOn && !!xType) {
    visitorData.sscid = sscid;
    visitorData.sscidCreatedOn = sscidCreatedOn;
    visitorData.xTypeParam = xType;
  }

  const newVisitor = await VisitorService.createCreateAccountVisitor(visitorData);
  return newVisitor;
};

export const applyForKarmaCard = async (
  req: IRequest<{}, {}, IKarmaCardRequestBody>,
): Promise<ApplicationDecision> => {
  let _visitor;
  let { requestor } = req;
  let { firstName, lastName, email } = req.body;
  // product subscription id can be defaulted to our standard for now, but if in the future we need another one we have that option
  const {
    address1,
    address2,
    birthDate,
    phone,
    postalCode,
    state,
    ssn,
    city,
    urlParams,
    sscid,
    sscidCreatedOn,
    xType,
    personaInquiryId,
  } = req.body;

  _checkIfValidApplyForKarmaCard(req);

  if (!!requestor && requestor.emails.find((e) => !!e.primary).email !== email) {
    requestor = null;
  }

  firstName = formatName(firstName);
  lastName = formatName(lastName);
  email = email.toLowerCase();

  const existingVisitor = await VisitorModel.findOne({ email });
  const existingUser = (await UserModel.findOne({ 'emails.email': email })) as IUserDocument;
  // Email belongs to existing user, throw an error and have user log in
  if (!requestor && existingUser) throw new Error('Email already registered with Karma Wallet account. Please sign in to continue.');
  // Existing visitor without an existing user (could have applied previously)
  if (!!existingVisitor && !existingUser) _visitor = existingVisitor;

  // I. EXISTING USER WITH KARMA WALLET ACCOUNT SHOULD NOT BE ABLE TO APPLY, FRONTEND SHOULD HAVE ALSO CHECKED THIS
  if (!!existingUser) {
    if (await userHasActiveOrSuspendedDepositAccount(existingUser._id.toString())) {
      // early return since user is already registered
      return {
        marqeta: {
          kycResult: {
            status: IMarqetaKycState.failure,
            codes: [ReasonCode.Already_Registered],
          },
        },
        persona: existingUser?.integrations?.persona,
      };
    }
  }

  // II. CREATE NEW VISITOR IF NO VISITOR OR USER YET
  if (!existingVisitor && !existingUser) {
    _visitor = await _createNewVisitorFromApply(email, urlParams, sscid, sscidCreatedOn, xType);
  }

  // pull the persona inquiry data
  const {
    newInquiry: inquiryResult,
    integration: personaIntegration,
  } = await fetchInquiryAndCreateOrUpdateIntegration(personaInquiryId, existingUser || _visitor);

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
    email: email.toLowerCase(),
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
  const { status, codes } = kycResponse.result;
  const kycErrorCodes = codes?.map((item: any) => item.code);
  const marqetaIntegration = {
    userToken: marqetaUserResponse.token,
    kycResult: { status, codes: kycErrorCodes },
    email,
    ...marqetaUserResponse,
  };

  const applicationDecision = {
    marqeta: marqetaIntegration,
    persona: personaIntegration,
    internalKycTemplateId: inquiryResult?.templateId,
  };

  const kycStatus = status;

  if (!existingUser) {
    // IF VISITOR ONLY, UPDATE VISITOR WITH MARQETA DECISION
    _visitor = await VisitorService.updateCreateAccountVisitor(_visitor, {
      marqeta: applicationDecision.marqeta,
      email,
      params: urlParams,
      sscid,
      sscidCreatedOn,
      xTypeParam: xType,
      actions: [{ type: VisitorActionEnum.AppliedForCard, createdOn: getUtcDate().toDate() }],
    });
  } else {
    // IF EXISTING USER, UPDATE USER WITH MARQETA DECISION
    // Is it ok to overwrite the shareasale data if it already exists?
    if (!existingUser.integrations) existingUser.integrations = {};
    if (!!sscid) existingUser.integrations.shareasale = { sscid, sscidCreatedOn, xTypeParam: xType };
    existingUser.integrations.marqeta = applicationDecision.marqeta;
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

  const notApproved = kycStatus !== IMarqetaKycState.success || !personaInquiryInSuccessState(inquiryResult);

  // FAILED OR PENDING KYC, already saved to user or visitor object
  if (notApproved) {
    if (!!existingUser) {
      karmaCardApplication.userId = existingUser._id.toString();
    } else {
      karmaCardApplication.visitorId = _visitor._id;
      const newData: VisitorService.ICreateAccountRequest = {
        marqeta: applicationDecision.marqeta,
        email,
        actions: [{ type: VisitorActionEnum.ApplicationDeclined, createdOn: getUtcDate().toDate() }],
      };
      if (!!urlParams) newData.params = urlParams;
      _visitor = await VisitorService.updateCreateAccountVisitor(_visitor, newData);
    }

    // set this marqeta user's status to suspended because they failed KYC
    await updateMarqetaUserStatus(!!existingUser ? existingUser : _visitor, IMarqetaUserStatus.SUSPENDED, MarqetaReasonCodeEnum.AccountUnderReview);
    await storeKarmaCardApplication(karmaCardApplication);
    return applicationDecision;
  }

  // SUCCESSFUL KYC, initiate Approved State actions
  const userObject = await handleApprovedState(karmaCardApplication, existingUser || _visitor);

  return {
    marqeta: userObject.toObject()?.integrations?.marqeta,
    persona: personaIntegration,
    internalKycTemplateId: inquiryResult?.templateId,
    paymentLink: await createUserProductSubscriptionAndPaymentLink(userObject),
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

// export const cancelKarmaMembership = async (user: IUserDocument, membershipType: KarmaMembershipTypeEnumValues) => {
//   try {
//     const existingMembership = user.karmaMemberships?.find(
//       (membership) => membership.type === membershipType && membership.status === KarmaMembershipStatusEnum.active,
//     );
//     if (!existingMembership) throw new CustomError('User does not have an active membership to cancel', ErrorTypes.NOT_FOUND);

//     existingMembership.status = KarmaMembershipStatusEnum.cancelled;
//     existingMembership.lastModified = getUtcDate().toDate();
//     existingMembership.cancelledOn = getUtcDate().toDate();
//     return user.save();
//   } catch (err) {
//     console.error(`Error cancelling ${membershipType} membership for user ${user._id}: ${err}`);
//     if ((err as CustomError)?.isCustomError) {
//       throw err;
//     }
//     throw new CustomError('Error cancelling karma membership', ErrorTypes.SERVER);
//   }
// };
