import { IMarqetaCreateUser } from '../../integrations/marqeta/types';
import { generateRandomPasswordString } from '../../lib/misc';
import { IUrlParam } from '../../models/user';
import { IRequest } from '../../types/request';
import * as UserService from '../user';
import * as VisitorService from '../visitor';

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

export const performMarqetaCreateAndKYC = async (kycData: IMarqetaCreateUser) => {
  console.log('//////// info', kycData);
  // perform whatever is needed for applying through Marqeta
};

export const applyForKarmaCard = async (req: IRequest<{}, {}, IKarmaCardRequestBody>) => {
  const { requestor } = req;
  let newVisitor;
  const { firstName, lastName, address1, address2, birthDate, postalCode, state, ssn, email, city, urlParams } = req.body;
  console.log('///// this is the birthdate', birthDate);
  if (!firstName || !lastName || !address1 || !birthDate || !postalCode || !state || !ssn || !city) throw new Error('Missing required fields');

  if (!requestor) {
    const newVisitorResponse = await VisitorService.createCreateAccountVisitor({ params: urlParams, email });
    newVisitor = newVisitorResponse;
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

  const marqetaResponse = await performMarqetaCreateAndKYC(marqetaKYCInfo);
  console.log('/////// This is the marqeta response', marqetaResponse);
  // perform the KYC logic and Marqeta stuff here

  // Create a User if Approved or Pending status from marqetaResponse once we build out performMarqetaCreateAndKYC
  const isApprovedOrPending = true;

  if (isApprovedOrPending) {
    let userObject;
    // if there is an existing user, add the marqeta integration to the existing user
    if (!!requestor) userObject = requestor;
    // if there is no existing user, create a new user based on the visitor you created before KYC/Marqeta
    if (!requestor) {
      userObject = await UserService.register(req, {
        name: `${firstName} ${lastName}`,
        password: generateRandomPasswordString(14),
        visitorId: newVisitor._id,
      });
    }

    // add the marqeta integration to the newly created user or the existing user (userObject)
    // determine the appropriate next steps for getting the user to update their password and login to their profile, maybe an email so that we can also verify their email while we're at it?
    console.log('/////// This is the user object', userObject);
  } else {
    // Declined then we do not create a user here
    // set the marqeta integration and status on the visitor object
  }
  // What do we need to return to the frontend after this?

  // Decision from Marqeta/KYC mapped to our own language and info about next steps
  // return { status: 'success', message: 'Your application has been submitted. Please check your email to finish setting up your account.' };
  // return { status: 'error', message: 'Your application has been declined. Please check your email for next steps.' };
  // return { status: 'error', message: 'Your application is pending. Please check your email for next steps.' };
};
