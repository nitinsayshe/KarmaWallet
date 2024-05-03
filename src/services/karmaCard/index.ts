/* eslint-disable import/no-cycle */
import { v4 as uuid } from 'uuid';
import dayjs from 'dayjs';
import { FilterQuery } from 'mongoose';
import { createCard } from '../../integrations/marqeta/card';
import { listUserKyc, processUserKyc } from '../../integrations/marqeta/kyc';
import { IMarqetaCreateUser, IMarqetaKycState, IMarqetaUserIntegrations, IMarqetaUserStatus } from '../../integrations/marqeta/types';
import { createMarqetaUser, getMarqetaUserByEmail, updateMarqetaUser } from '../../integrations/marqeta/user';
import { formatName, generateRandomPasswordString } from '../../lib/misc';
import {
  ApplicationStatus,
  IKarmaCardApplication,
  IKarmaCardApplicationDocument,
  IShareableCardApplication,
  KarmaCardApplicationModel,
} from '../../models/karmaCardApplication';
import { IUserDocument, UserModel } from '../../models/user';
import { IVisitorDocument, VisitorModel } from '../../models/visitor';
import { IRequest } from '../../types/request';
import * as UserService from '../user';
import * as VisitorService from '../visitor';
import {
  ReasonCode,
  getShareableMarqetaUser,
  hasKarmaWalletCards,
  openBrowserAndAddShareASaleCode,
  updateActiveCampaignDataAndJoinGroupForApplicant,
} from './utils';
import { KarmaCardLegalModel } from '../../models/karmaCardLegal';
import CustomError, { asCustomError } from '../../lib/customError';
import { ErrorTypes } from '../../lib/constants';
import { createDeclinedKarmaWalletCardUserNotification, createKarmaCardWelcomeUserNotification } from '../user_notification';
import { updateUserUrlParams, handleMarqetaUserActiveTransition } from '../user';
import { updateCustomFields } from '../../integrations/activecampaign';
import { ActiveCampaignCustomFields } from '../../lib/constants/activecampaign';
import { IMarqetaListKYCResponse } from '../../clients/marqeta/types';
import { IDeclinedData } from '../email/types';
import { createComplyAdvantageSearch, ICreateSearchForUserData, userPassesComplyAdvantage } from '../../integrations/complyAdvantage';
import { UserNotificationModel } from '../../models/user_notification';
import { NotificationChannelEnum, NotificationTypeEnum } from '../../lib/constants/notification';
import { createShareasaleTrackingId } from '../user/utils';
import { IUrlParam } from '../user/types';
import {
  IKarmaMembershipData,
  KarmaMembershipPaymentPlanEnumValues,
  KarmaMembershipStatusEnum,
  KarmaMembershipTypeEnumValues,
} from '../../models/user/types';
import { getUtcDate } from '../../lib/date';

export const { MARQETA_VIRTUAL_CARD_PRODUCT_TOKEN, MARQETA_PHYSICAL_CARD_PRODUCT_TOKEN } = process.env;

export interface IKarmaCardRequestBody {
  address1: string;
  address2?: string;
  birthDate: string;
  phone: string;
  city: string;
  email?: string;
  firstName: string;
  lastName: string;
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

export interface KycData extends Partial<ICreateSearchForUserData> {}

export type AddKarmaMembershipToUserRequest = {
  type: KarmaMembershipTypeEnumValues;
  paymentPlan: KarmaMembershipPaymentPlanEnumValues;
};

export const performInternalKyc = async (
  user: IUserDocument | IVisitorDocument,
  data: KycData,
): Promise<IUserDocument | IVisitorDocument> => {
  try {
    const { firstName, lastName, birthYear } = data;
    const clientRef = user?.integrations?.complyAdvantage?.client_ref || uuid();
    // create comply advantage search
    const complyAdvantageSearchResults = await createComplyAdvantageSearch({
      refId: clientRef,
      firstName,
      lastName,
      birthYear,
    });

    if (!complyAdvantageSearchResults) throw new CustomError('Error creating comply advantage search', ErrorTypes.SERVER);

    if (!user.integrations) user.integrations = {};
    user.integrations.complyAdvantage = {
      ...complyAdvantageSearchResults.data,
    };

    user = await user.save();
    if (!(await userPassesComplyAdvantage(complyAdvantageSearchResults.data))) {
      throw new CustomError('User failed comply advantage', ErrorTypes.INVALID_ARG);
    }
    return user;
  } catch (err) {
    console.error(`Error performing internal kyc: ${err}`);
  }
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
    console.error('User does not have marqeta integration PERFORMKYCFORUSERORVISITOR');
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

  // store the karma card application log
  await userObject.save();
  return userObject;
};

export const applyForKarmaCard = async (req: IRequest<{}, {}, IKarmaCardRequestBody>) => {
  let _visitor;
  let { requestor } = req;
  let { firstName, lastName, email } = req.body;
  const { address1, address2, birthDate, phone, postalCode, state, ssn, city, urlParams, sscid, sscidCreatedOn, xType } = req.body;

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
  const newUser = !existingUser;
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
  const { status, codes } = kycResponse.result;
  const kycErrorCodes = codes.map((item: any) => item.code);

  const marqeta = {
    userToken: marqetaUserResponse.token,
    kycResult: { status, codes: kycErrorCodes },
    email,
    ...marqetaUserResponse,
  };

  const kycStatus = status;

  if (!existingUser) {
    // Update the visitors marqeta Kyc status
    _visitor = await VisitorService.updateCreateAccountVisitor(_visitor, {
      marqeta,
      email,
      params: urlParams,
      sscid,
      sscidCreatedOn,
      xTypeParam: xType,
    });
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
    const data = getShareableMarqetaUser(marqeta);
    const { reason, acceptedDocuments, solutionText, message } = data;

    const dataObj: IDeclinedData = {
      acceptedDocuments,
      reason,
      name: firstName,
      message,
      solutionText,
      status: data.status,
    };

    if (!!existingUser) {
      karmaCardApplication.userId = existingUser._id.toString();
      dataObj.user = existingUser;
      existingUser.integrations.marqeta = marqeta;
      if (!!urlParams) await updateUserUrlParams(existingUser, urlParams);
      await existingUser.save();
    } else {
      karmaCardApplication.visitorId = _visitor._id;
      const newData: VisitorService.ICreateAccountRequest = { marqeta, email };
      if (!!urlParams) newData.params = urlParams;
      _visitor = await VisitorService.updateCreateAccountVisitor(_visitor, newData);
      dataObj.visitor = _visitor;
    }

    await storeKarmaCardApplication(karmaCardApplication);
    await createDeclinedKarmaWalletCardUserNotification(dataObj);
    return marqeta;
  }

  // PASSED KYC
  const successData: IApplySuccessData = {
    email,
    firstName,
    lastName,
    visitorId: _visitor?._id || '',
    postalCode,
  };

  if (!!urlParams) successData.urlParams = urlParams;

  const userDocument = await handleKarmaCardApplySuccess(successData);

  karmaCardApplication.status = ApplicationStatus.SUCCESS;
  karmaCardApplication.kycResult = {
    status: IMarqetaKycState.success,
    codes: [],
  };

  karmaCardApplication.userId = userDocument._id.toString();
  userDocument.integrations.marqeta = marqeta;
  userDocument.integrations.marqeta.status = IMarqetaUserStatus.ACTIVE;

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

  await userDocument.save();
  await storeKarmaCardApplication(karmaCardApplication);
  await handleMarqetaUserActiveTransition(userDocument, newUser);
  const applyResponse = userDocument?.integrations?.marqeta;
  return applyResponse;
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

export const updateKarmaMembershipPaymentPlan = async (
  user: IUserDocument,
  paymentPlan: KarmaMembershipPaymentPlanEnumValues,
) => {
  try {
    const existingMembership = user.karmaMemberships?.find(
      (membership) => membership.status === KarmaMembershipStatusEnum.active,
    );
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
