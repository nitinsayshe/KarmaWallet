/* eslint-disable import/no-cycle */
import dayjs from 'dayjs';
import { FilterQuery } from 'mongoose';
import { createCard } from '../../integrations/marqeta/card';
import { listUserKyc, processUserKyc } from '../../integrations/marqeta/kyc';
import { IMarqetaCreateUser, IMarqetaKycState, IMarqetaUserStatus } from '../../integrations/marqeta/types';
import { createMarqetaUser, getMarqetaUserByEmail, updateMarqetaUser } from '../../integrations/marqeta/user';
import { generateRandomPasswordString } from '../../lib/misc';
import {
  ApplicationStatus,
  IKarmaCardApplication,
  IKarmaCardApplicationDocument,
  IShareableCardApplication,
  KarmaCardApplicationModel,
} from '../../models/karmaCardApplication';
import { IUrlParam, IUserDocument, UserModel } from '../../models/user';
import { VisitorModel } from '../../models/visitor';
import { IRequest } from '../../types/request';
import { mapMarqetaCardtoCard } from '../card';
import * as UserService from '../user';
import * as VisitorService from '../visitor';
import { ReasonCode, hasKarmaWalletCards } from './utils';
import { KarmaCardLegalModel } from '../../models/karmaCardLegal';
import CustomError, { asCustomError } from '../../lib/customError';
import { ErrorTypes } from '../../lib/constants';
import { createKarmaCardWelcomeUserNotification } from '../user_notification';
import { joinGroup } from '../groups';
import { validatePhoneNumber } from '../user/utils/validate';
import { IActiveCampaignSubscribeData, updateNewUserSubscriptions } from '../subscription';
import { GroupModel } from '../../models/group';
import { updateUserUrlParams } from '../user';
import { updateCustomFields } from '../../integrations/activecampaign';
import { ActiveCampaignCustomFields } from '../../lib/constants/activecampaign';
import { IMarqetaListKYCResponse } from '../../clients/marqeta/types';

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
}

interface IApplySuccessData {
  email: string;
  firstName: string;
  lastName: string;
  urlParams?: IUrlParam[];
  virtualCardResponse: any;
  physicalCardResponse: any;
  visitorId?: string;
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

export const isUserKYCVerified = (userStatus: IMarqetaUserStatus, kycResponse: IMarqetaListKYCResponse) => {
  const hasSuccessfulKYC = kycResponse.data.find((kyc: any) => kyc.result.status === IMarqetaKycState.success);
  return userStatus === IMarqetaUserStatus.ACTIVE && !!hasSuccessfulKYC;
};

const performMarqetaCreateAndKYC = async (userData: IMarqetaCreateUser) => {
  // find the email is already register with marqeta or not
  const { data } = await getMarqetaUserByEmail({ email: userData.email });
  let userToken;
  let marqetaUserResponse;
  let kycResponse;
  let virtualCardResponse;
  let physicalCardResponse;

  if (data.length > 0) {
    // if email is register in marqeta then update the user in marqeta
    userToken = data[0].token;
    marqetaUserResponse = await updateMarqetaUser(userToken, userData);
  } else {
    // if not register then register user to marqeta
    marqetaUserResponse = await createMarqetaUser(userData);
    userToken = marqetaUserResponse.token;
  }

  // get the kyc list of a user
  kycResponse = await listUserKyc(userToken);

  // perform the kyc through marqeta & create the card
  if (!isUserKYCVerified(marqetaUserResponse.status, kycResponse)) {
    kycResponse = await processUserKyc(marqetaUserResponse.token);
    if (kycResponse?.result?.status === IMarqetaKycState.success) {
      marqetaUserResponse.status = IMarqetaUserStatus.ACTIVE;
      [virtualCardResponse, physicalCardResponse] = await Promise.all([
        await createCard({ userToken: marqetaUserResponse.token, cardProductToken: MARQETA_VIRTUAL_CARD_PRODUCT_TOKEN }),
        await createCard({ userToken: marqetaUserResponse.token, cardProductToken: MARQETA_PHYSICAL_CARD_PRODUCT_TOKEN }),
      ]);
    }
  }

  return { marqetaUserResponse, kycResponse, virtualCardResponse, physicalCardResponse };
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

export const updateActiveCampaignDataAndJoinGroupForApplicant = async (
  userObject: IUserDocument,
  urlParams?: IUrlParam[],
) => {
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
      const mockRequest = ({
        requestor: userObject,
        authKey: '',
        body: {
          code: groupCode,
          email: userObject?.emails?.find((e) => e.primary)?.email,
          userId: userObject._id.toString(),
          skipSubscribe: true,
        },
      } as any);

      const userGroup = await joinGroup(mockRequest);
      if (!!userGroup) {
        const group = await GroupModel.findById(userGroup.group);
        subscribeData.groupName = group.name;
        subscribeData.tags = [group.name];
      }
    }
  }
  await updateNewUserSubscriptions(userObject, subscribeData);
};

export const handleExistingUserApplySuccess = async (userObject: IUserDocument, urlParams?: IUrlParam[]) => {
  const userEmail = userObject.emails.find(email => !!email.primary).email;
  if (!!urlParams) {
    await updateUserUrlParams(userObject, urlParams);
    await updateActiveCampaignDataAndJoinGroupForApplicant(userObject, urlParams);
  } else {
    await updateActiveCampaignDataAndJoinGroupForApplicant(userObject);
  }
  // add existingUser flag to active campaign
  await updateCustomFields(
    userEmail,
    [{ field: ActiveCampaignCustomFields.existingWebAppUser, update: 'true' }],
  );
  await createKarmaCardWelcomeUserNotification(userObject, false);
};

export const handleKarmaCardApplySuccess = async ({
  email,
  firstName,
  lastName,
  urlParams,
  virtualCardResponse,
  physicalCardResponse,
  visitorId,
}: IApplySuccessData): Promise<IUserDocument> => {
  // find the user again since there is a potential race condition
  let userObject = await UserModel.findOne({ 'emails.email': email });
  // EXISTING USER
  if (!!userObject) {
    await handleExistingUserApplySuccess(userObject, urlParams);
    userObject.name = `${firstName} ${lastName}`;
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
    await createKarmaCardWelcomeUserNotification(userObject, true);
  }

  // store marqeta card in DB
  await mapMarqetaCardtoCard(userObject._id.toString(), virtualCardResponse); // map virtual card
  await mapMarqetaCardtoCard(userObject._id.toString(), physicalCardResponse); // map physical card

  // store the karma card application log
  await userObject.save();
  return userObject;
};

export const applyForKarmaCard = async (req: IRequest<{}, {}, IKarmaCardRequestBody>) => {
  let _visitor;
  let { requestor } = req;
  const { firstName, lastName, address1, address2, birthDate, phone, postalCode, state, ssn, email, city, urlParams } = req.body;

  if (!firstName || !lastName || !address1 || !birthDate || !phone || !postalCode || !state || !ssn || !city) { throw new Error('Missing required fields'); }
  if (!requestor && !email) throw new Error('Missing required fields');

  const phoneValidation = validatePhoneNumber(phone);
  if (!phoneValidation.valid) {
    throw new CustomError(`Invalid phone number. ${phoneValidation.message}`, ErrorTypes.INVALID_ARG);
  }

  if (!!requestor && requestor?.emails[0].email !== email) {
    requestor = null;
  }

  const existingVisitor = await VisitorModel.findOne({ email: email.toLowerCase() });
  const existingUser = await UserModel.findOne({ 'emails.email': email.toLocaleLowerCase() });
  // if an applicant is using an email that belongs to a user
  if (!requestor && existingUser) throw new Error('Email already registered with Karma Wallet account. Please sign in to continue.');
  // if they are an existing visitor but not an existing user (could have applied previously)
  if (!!existingVisitor && !existingUser) _visitor = existingVisitor;

  // Existing user, check if already has cards
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

  // New user/visitor/applicant
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

    const newVisitorResponse = await VisitorService.createCreateAccountVisitor(visitorData);
    _visitor = newVisitorResponse;
  }

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
  // perform the KYC logic and Marqeta stuff here
  const marqetaResponse = await performMarqetaCreateAndKYC(marqetaKYCInfo);

  const { marqetaUserResponse, kycResponse, virtualCardResponse, physicalCardResponse } = marqetaResponse;
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
    _visitor = await VisitorService.updateCreateAccountVisitor(_visitor, { marqeta, email, params: urlParams });
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
  // prepare the data object for karmaCardApplication

    if (_visitor) karmaCardApplication.visitorId = _visitor._id;
    if (!!existingUser) karmaCardApplication.userId = existingUser._id.toString();
    // store the karma card application log
    await storeKarmaCardApplication(karmaCardApplication);
    return marqeta;
  }

  // KYC SUCCESS
  const successData: IApplySuccessData = {
    email,
    firstName,
    lastName,
    virtualCardResponse,
    physicalCardResponse,
    visitorId: _visitor?._id || '',
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
  await userDocument.save();
  await storeKarmaCardApplication(karmaCardApplication);
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
