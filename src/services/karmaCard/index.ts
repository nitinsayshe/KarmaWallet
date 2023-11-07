import dayjs from 'dayjs';
import { FilterQuery } from 'mongoose';
import { createCard } from '../../integrations/marqeta/card';
import { listUserKyc, processUserKyc } from '../../integrations/marqeta/kyc';
import { IMarqetaCreateUser, IMarqetaKycState } from '../../integrations/marqeta/types';
import { createMarqetaUser, getMarqetaUserByEmail, updateMarqetaUser } from '../../integrations/marqeta/user';
import { generateRandomPasswordString } from '../../lib/misc';
import { ApplicationStatus, IKarmaCardApplication, IKarmaCardApplicationDocument, IShareableCardApplication, KarmaCardApplicationModel } from '../../models/karmaCardApplication';
import { IUrlParam, UserModel } from '../../models/user';
import { VisitorModel } from '../../models/visitor';
import { IRequest } from '../../types/request';
import { mapMarqetaCardtoCard } from '../card';
import * as UserService from '../user';
import * as VisitorService from '../visitor';
import { IMarqetaUserState, ReasonCode } from './utils';
import { issuerStatement, supportPhoneNumber, initiateTransferStatement, issuerCashbackStatement } from './constants/marqetaLegal';

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
  if (!!marqetaUserResponse
    && (marqetaUserResponse?.status !== IMarqetaUserState.active || kycResponse.data[0].result.status === IMarqetaKycState.success)) {
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
  await KarmaCardApplicationModel.findOneAndUpdate({ visitorId: cardApplicationData.visitorId }, cardApplicationData, { upsert: true, new: true });
};

export const _getKarmaCardApplications = async (query: FilterQuery<IKarmaCardApplication>) => KarmaCardApplicationModel.find(query).sort({ lastModified: -1 });

export const getKarmaCardApplications = async () => _getKarmaCardApplications({});

export const applyForKarmaCard = async (req: IRequest<{}, {}, IKarmaCardRequestBody>) => {
  let { requestor } = req;
  let _visitor;

  const { firstName, lastName, address1, address2, birthDate, postalCode, state, ssn, email, city, urlParams } = req.body;
  if (!firstName || !lastName || !address1 || !birthDate || !postalCode || !state || !ssn || !city) throw new Error('Missing required fields');
  if (!requestor && !email) throw new Error('Missing required fields');

  if (!!requestor && requestor?.emails[0].email !== email) {
    requestor = null;
  }

  const existingVisitor = await VisitorModel.findOne({ email: email.toLowerCase() });
  const existingUser = await UserModel.findOne({ 'emails.email': email.toLocaleLowerCase() });

  if (!requestor && existingUser) throw new Error('Email already register with Karma Wallet kindly login first!');
  if (!!existingVisitor) {
    _visitor = existingVisitor;
    if (_visitor?.integrations?.marqeta?.kycResult?.status === IMarqetaKycState.success) {
      // if user is already having a marqeta aka Karma wallet card
      const applyResponse = {
        kycResult: {
          status: IMarqetaKycState.success,
          codes: [ReasonCode.Already_Registered],
        },
      };
      return applyResponse;
    }
  } else {
    const newVisitorResponse = await VisitorService.createCreateAccountVisitor({ params: urlParams, email });
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

  if (!requestor || requestor?.emails[0].email === email) {
    // Update the visitors marqeta Kyc status
    _visitor = await VisitorService.updateCreateAccountVisitor(_visitor, { marqeta, email });
  }
  // prepare the data object for karmaCardApplication
  const karmaCardApplication: IKarmaCardApplication = {
    visitorId: _visitor._id,
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
      status, codes: kycErrorCodes,
    },
    lastModified: dayjs().utc().toDate(),
  };

  // if marqeta Kyc failed / pending
  if (kycStatus !== IMarqetaKycState.success) {
    // store the karma card application log
    await storeKarmaCardApplication(karmaCardApplication);
    const applyResponse = _visitor?.integrations?.marqeta;
    return applyResponse;
  }

  // if marqeta Kyc Approved/success
  if (kycStatus === IMarqetaKycState.success) {
    let userObject;
    // if there is an existing user, add the marqeta integration to the existing user
    if (!!requestor) {
      // save the marqeta user data
      requestor.integrations.marqeta = marqeta;
      userObject = await requestor.save();
    }

    if (!requestor) {
      // if there is no existing user, create a new user based on the visitor you created before KYC/Marqeta
      // add the marqeta integration to the newly created user or the existing user (userObject)
      const { user } = await UserService.register(req, {
        name: `${firstName} ${lastName}`,
        password: generateRandomPasswordString(14),
        visitorId: _visitor._id,
        isAutoGenerated: true,
      });
      userObject = user;
    }
    // store marqeta card in DB
    await mapMarqetaCardtoCard(userObject._id, virtualCardResponse); // map virtual card
    await mapMarqetaCardtoCard(userObject._id, physicalCardResponse); // map physical card

    // store the karma card application log
    await storeKarmaCardApplication({ ...karmaCardApplication, userId: userObject._id, status: ApplicationStatus.SUCCESS });

    const applyResponse = userObject?.integrations?.marqeta;
    return applyResponse;
  }
};

export const getKarmaCardLegalText = async () => ({
  issuerStatement,
  supportPhoneNumber,
  initiateTransferStatement,
  issuerCashbackStatement,
});
