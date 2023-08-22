import { Card } from '../../clients/marqeta/card';
import { Kyc } from '../../clients/marqeta/kyc';
import { MarqetaClient } from '../../clients/marqeta/marqetaClient';
import { User } from '../../clients/marqeta/user';
import { IMarqetaCreateUser, IMarqetaKycState } from '../../integrations/marqeta/types';
import { generateRandomPasswordString } from '../../lib/misc';
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

export const performMarqetaCreateAndKYC = async (userData: IMarqetaCreateUser) => {
  const marqetaClient = new MarqetaClient(); // Instantiate the MarqetaClient
  const user = new User(marqetaClient); // Instantiate the marqeta User class
  const kyc = new Kyc(marqetaClient); // Instantiate the marqeta Kyc class
  const card = new Card(marqetaClient); // Instantiate the marqeta Card class

  // find the email is already register with marqeta or not
  const { data } = await user.getUserByEmail({ email: userData.email });

  let marqetaUserResponse;
  let kycResponse;
  let cardResponse;

  if (data.length > 0) {
    // if email is register in marqeta then update the user in marqeta
    marqetaUserResponse = await user.updateUser(data[0].token, userData);
  } else {
    // if not register then register user to marqeta
    marqetaUserResponse = await user.createUser(userData);
  }
  // perform the kyc through marqeta & create the card
  if (!!marqetaUserResponse && marqetaUserResponse?.status !== IMarqetaUserState.active) {
    [kycResponse, cardResponse] = await Promise.all([
      await kyc.processKyc({ userToken: marqetaUserResponse.token }),
      await card.createCard({ userToken: marqetaUserResponse.token, cardProductToken: IMarqetaCardProducts.virtualCard }),
    ]);
  }
  return { marqetaUserResponse, kycResponse, cardResponse };
};

export const applyForKarmaCard = async (req: IRequest<{}, {}, IKarmaCardRequestBody>) => {
  let { requestor } = req;
  let _visitor;
  let _user;

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
          codes: [ReasonCode.Already_Register],
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
  const { marqetaUserResponse, kycResponse, cardResponse } = await performMarqetaCreateAndKYC(marqetaKYCInfo);
  // get the kyc result code
  const { status, codes } = kycResponse.result;
  const kycErrorCodes = codes.map((item: any) => item.code);
  const marqeta = {
    userToken: marqetaUserResponse.token,
    kycResult: { status, codes: kycErrorCodes },
    email,
  };

  if (!requestor || requestor?.emails[0].email === email) {
    // Update the visitors marqeta Kyc status
    _visitor = await VisitorService.updateCreateAccountVisitor(_visitor, { marqeta, email });
  }
  const kycStatus = status;

  // if marqeta Kyc failed / pending
  if (kycStatus !== IMarqetaKycState.success) {
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
    await mapMarqetaCardtoCard(userObject._id, cardResponse);
    const applyResponse = userObject?.integrations?.marqeta;
    return applyResponse;
    // determine the appropriate next steps for getting the user to update their password and login to their profile, maybe an email so that we can also verify their email while we're at it?
  }
};
