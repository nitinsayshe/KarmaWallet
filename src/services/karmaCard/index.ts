import dayjs from 'dayjs';
import { FilterQuery } from 'mongoose';
import { createCard } from '../../integrations/marqeta/card';
import { listUserKyc, processUserKyc } from '../../integrations/marqeta/kyc';
import { IMarqetaCreateUser, IMarqetaKycState } from '../../integrations/marqeta/types';
import { createMarqetaUser, getMarqetaUserByEmail, updateMarqetaUser } from '../../integrations/marqeta/user';
import { generateRandomPasswordString } from '../../lib/misc';
import {
  ApplicationStatus,
  IKarmaCardApplication,
  IKarmaCardApplicationDocument,
  IShareableCardApplication,
  KarmaCardApplicationModel,
} from '../../models/karmaCardApplication';
import { IUrlParam, UserModel } from '../../models/user';
import { VisitorModel } from '../../models/visitor';
import { IRequest } from '../../types/request';
import { mapMarqetaCardtoCard } from '../card';
import * as UserService from '../user';
import * as VisitorService from '../visitor';
import { IMarqetaUserState, ReasonCode } from './utils';
import { KarmaCardLegalModel } from '../../models/karmaCardLegal';
import CustomError, { asCustomError } from '../../lib/customError';
import { ErrorTypes } from '../../lib/constants';
import { createKarmaCardWelcomeUserNotification } from '../user_notification';
import { MainBullClient } from '../../clients/bull/main';
import { ActiveCampaignSyncTypes } from '../../lib/constants/activecampaign';
import { JobNames } from '../../lib/constants/jobScheduler';

export const { MARQETA_VIRTUAL_CARD_PRODUCT_TOKEN, MARQETA_PHYSICAL_CARD_PRODUCT_TOKEN } = process.env;

export interface IKarmaCardRequestBody {
  address1: string;
  address2?: string;
  birthDate: string;
  city: string;
  email?: string;
  firstName: string;
  lastName: string;
  postalCode: string;
  ssn: string;
  state: string;
  urlParams?: IUrlParam[];
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
  city,
  postalCode,
  state,
  kycResult,
  status,
  lastModified,
});

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
  if (
    !!marqetaUserResponse
    && (marqetaUserResponse?.status !== IMarqetaUserState.active || kycResponse.data[0].result.status === IMarqetaKycState.success)
  ) {
    kycResponse = await processUserKyc(marqetaUserResponse.token);
    if (kycResponse?.result?.status === IMarqetaKycState.success) {
      marqetaUserResponse.status = IMarqetaUserState.active;
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

export const applyForKarmaCard = async (req: IRequest<{}, {}, IKarmaCardRequestBody>) => {
  let _visitor;
  let { requestor } = req;
  const { firstName, lastName, address1, address2, birthDate, postalCode, state, ssn, email, city, urlParams } = req.body;

  if (!firstName || !lastName || !address1 || !birthDate || !postalCode || !state || !ssn || !city) { throw new Error('Missing required fields'); }
  if (!requestor && !email) throw new Error('Missing required fields');

  if (!!requestor && requestor?.emails[0].email !== email) {
    requestor = null;
  }

  const existingVisitor = await VisitorModel.findOne({ email: email.toLowerCase() });
  const existingUser = await UserModel.findOne({ 'emails.email': email.toLocaleLowerCase() });
  // if an applicant is using an email that belongs to a user
  if (!requestor && existingUser) throw new Error('Email already registered with Karma Wallet account. Please sign in to continue.');
  // if they are an existing visitor but not an existing user (could have applied previously)
  if (!!existingVisitor && !existingUser) {
    _visitor = existingVisitor;
    if (_visitor?.integrations?.marqeta?.kycResult?.status === IMarqetaKycState.success) {
      // if user is already having a marqeta aka Karma wallet card
      const applyResponse = {
        kycResult: {
          status: IMarqetaKycState.failure,
          codes: [ReasonCode.Already_Registered],
        },
      };
      return applyResponse;
    }
    // if is first time applying for the card or visiting site
  } else if (!existingVisitor && !existingUser) {
    const visitorData: any = {
      email,
      params: urlParams,
    };

    if (!!urlParams && urlParams.find((param) => param.key === 'groupCode')) {
      visitorData.groupCode = urlParams.find((param) => param.key === 'groupCode')?.value;
    }

    const newVisitorResponse = await VisitorService.createCreateAccountVisitor(visitorData);
    _visitor = newVisitorResponse;
  }

  const marqetaKYCInfo: IMarqetaCreateUser = {
    firstName,
    lastName,
    address1,
    birthDate,
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
  } else {
    existingUser.integrations.marqeta = marqeta;
    await existingUser.save();
  }
  // prepare the data object for karmaCardApplication
  const karmaCardApplication: IKarmaCardApplication = {
    userToken: marqetaUserResponse?.userToken,
    firstName,
    lastName,
    email,
    address1,
    address2,
    birthDate,
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

  if (_visitor) {
    karmaCardApplication.visitorId = _visitor._id;
  }

  if (!!existingUser) {
    karmaCardApplication.userId = existingUser._id.toString();
  }

  // if marqeta Kyc failed / pending
  if (kycStatus !== IMarqetaKycState.success) {
    const applyResponse = marqeta;
    // store the karma card application log
    await storeKarmaCardApplication(karmaCardApplication);
    return applyResponse;
  }

  // if marqeta Kyc Approved/success
  if (kycStatus === IMarqetaKycState.success) {
    let userObject;
    // if there is an existing user, add the marqeta integration to the existing user
    if (!!existingUser) {
      userObject = existingUser;
      // send karma welcome email to user
      await createKarmaCardWelcomeUserNotification(existingUser, false);
    } else {
      // if there is no existing user, create a new user based on the visitor you created before KYC/Marqeta
      // add the marqeta integration to the newly created user or the existing user (userObject)
      const { user } = await UserService.register({
        name: `${firstName} ${lastName}`,
        password: generateRandomPasswordString(14),
        visitorId: _visitor._id,
        isAutoGenerated: true,
      });
      userObject = user;
      await createKarmaCardWelcomeUserNotification(userObject, true);
    }
    // store marqeta card in DB
    await mapMarqetaCardtoCard(userObject._id, virtualCardResponse); // map virtual card
    await mapMarqetaCardtoCard(userObject._id, physicalCardResponse); // map physical card

    // store the karma card application log
    await storeKarmaCardApplication({ ...karmaCardApplication, userId: userObject._id, status: ApplicationStatus.SUCCESS });

    const applyResponse = userObject?.integrations?.marqeta;

    // sync user in active campaign
    if (process.env.NODE_ENV === 'production') {
      MainBullClient.createJob(
        JobNames.SyncActiveCampaign,
        { syncType: ActiveCampaignSyncTypes.CARD_SIGNUP, cardSignupUserId: userObject._id.toString() },
        { jobId: `${JobNames.SyncActiveCampaign}-kw-card-signup-user-${userObject._id}` },
      );
    }
    return applyResponse;
  }
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
