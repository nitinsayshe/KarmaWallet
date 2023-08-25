import dayjs from 'dayjs';
import { FilterQuery } from 'mongoose';
import { Card } from '../../clients/marqeta/card';
import { Kyc } from '../../clients/marqeta/kyc';
import { MarqetaClient } from '../../clients/marqeta/marqetaClient';
import { User } from '../../clients/marqeta/user';
import { IMarqetaCreateUser, IMarqetaKycState } from '../../integrations/marqeta/types';
import { encrypt } from '../../lib/encryption';
import { generateRandomPasswordString } from '../../lib/misc';
import { IKarmaCardApplication, IKarmaCardApplicationDocument, IShareableCardApplication, KarmaCardApplicationModel } from '../../models/karmaCardApplication';
import { IUrlParam, UserModel } from '../../models/user';
import { VisitorModel } from '../../models/visitor';
import { IRequest } from '../../types/request';
import { mapMarqetaCardtoCard } from '../card';
import * as UserService from '../user';
import * as VisitorService from '../visitor';
import { IMarqetaCardProducts, IMarqetaUserState, ReasonCode } from './utils';

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
  cards,
  firstName,
  LastName,
  email,
  kycResult,
  lastModified,
}: IKarmaCardApplicationDocument): IShareableCardApplication & { _id: string } => ({
  _id,
  userId,
  visitorId,
  userToken,
  cards,
  firstName,
  LastName,
  email,
  kycResult,
  lastModified,
});

const performMarqetaCreateAndKYC = async (userData: IMarqetaCreateUser) => {
  const marqetaClient = new MarqetaClient(); // Instantiate the MarqetaClient
  const user = new User(marqetaClient); // Instantiate the marqeta User class
  const kyc = new Kyc(marqetaClient); // Instantiate the marqeta Kyc class
  const card = new Card(marqetaClient); // Instantiate the marqeta Card class

  // find the email is already register with marqeta or not
  const { data } = await user.getUserByEmail({ email: userData.email });

  let marqetaUserResponse;
  let kycResponse;
  let virtualCardResponse;
  let physicalCardResponse;

  if (data.length > 0) {
    // if email is register in marqeta then update the user in marqeta
    marqetaUserResponse = await user.updateUser(data[0].token, userData);
  } else {
    // if not register then register user to marqeta
    marqetaUserResponse = await user.createUser(userData);
  }
  // perform the kyc through marqeta & create the card
  if (!!marqetaUserResponse && marqetaUserResponse?.status !== IMarqetaUserState.active) {
    kycResponse = await kyc.processKyc({ userToken: marqetaUserResponse.token });
    if (kycResponse?.result?.status === IMarqetaKycState.success) {
      marqetaUserResponse.status = IMarqetaUserState.active;
      [virtualCardResponse, physicalCardResponse] = await Promise.all([
        await card.createCard({ userToken: marqetaUserResponse.token, cardProductToken: IMarqetaCardProducts.virtualCard }),
        await card.createCard({ userToken: marqetaUserResponse.token, cardProductToken: IMarqetaCardProducts.physicalCard }),
      ]);
    }
  }
  return { marqetaUserResponse, kycResponse, virtualCardResponse, physicalCardResponse };
};

const storeKarmaCardApplication = async (cardApplicationData: any) => {
  const { _visitor,
    marqetaUserResponse,
    kycResponse,
    virtualCardResponse,
    physicalCardResponse,
    userObject } = cardApplicationData;

  const applicationLog: IKarmaCardApplication = {
    userId: userObject?._id,
    visitorId: _visitor._id,
    userToken: marqetaUserResponse?.token,
    firstName: marqetaUserResponse?.first_name,
    LastName: marqetaUserResponse?.last_name,
    email: marqetaUserResponse?.email,
    kycResult: kycResponse?.result,
    lastModified: dayjs().utc().toDate(),
  };

  // if user succesfully get the cards
  if (virtualCardResponse && physicalCardResponse) {
    applicationLog.cards = [
      {
        ...virtualCardResponse,
        card_token: virtualCardResponse?.token,
        pan: encrypt(virtualCardResponse?.pan),
        last_four: encrypt(virtualCardResponse?.last_four),
      },
      {
        ...physicalCardResponse,
        card_token: physicalCardResponse?.token,
        pan: encrypt(physicalCardResponse?.pan),
        last_four: encrypt(physicalCardResponse?.last_four),
      },
    ];
  }
  // find and update the user application for karma card ,aka Marqeta card
  await KarmaCardApplicationModel.findOneAndUpdate({ visitorId: _visitor?._id }, applicationLog, { upsert: true, new: true });
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
          status: IMarqetaKycState.failure,
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
    address2,
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
  // prepare the data for karmaCardApplication
  const karmaCardApplication = { ...marqetaResponse, _visitor };

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
    await mapMarqetaCardtoCard(userObject._id, [virtualCardResponse, physicalCardResponse]);

    // store the karma card application log
    await storeKarmaCardApplication({ ...karmaCardApplication, userObject });

    const applyResponse = userObject?.integrations?.marqeta;
    return applyResponse;
    // determine the appropriate next steps for getting the user to update their password and login to their profile, maybe an email so that we can also verify their email while we're at it?
  }
};
