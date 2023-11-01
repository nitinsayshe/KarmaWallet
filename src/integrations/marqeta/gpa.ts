import { GPA } from '../../clients/marqeta/gpa';
import { MarqetaClient } from '../../clients/marqeta/marqetaClient';
import { ErrorTypes } from '../../lib/constants';
import CustomError from '../../lib/customError';
import { UserModel } from '../../models/user';
import { IMarqetaCreateGPAorder, IMarqetaLoadGpaFromProgramFundingSource } from './types';

export const { MARQETA_PROGRAM_FUNDING_SOURCE_TOKEN } = process.env;

// Instantiate the MarqetaClient
const marqetaClient = new MarqetaClient();

// Instantiate the GPA class
const gpa = new GPA(marqetaClient);

export const fundUserGPAFromProgramFundingSource = async (params: IMarqetaLoadGpaFromProgramFundingSource) => {
  const { userId, amount } = params;
  // find the user in DB
  const userData = await UserModel.findById(userId);
  if (!userData || !userData?.integrations?.marqeta?.userToken) {
    throw new CustomError('User not found', ErrorTypes.NOT_FOUND);
  }
  // format the marqeta GPA order payload
  const marqetaGPAOrder: IMarqetaCreateGPAorder = {
    userToken: userData.integrations.marqeta.userToken,
    amount,
    currencyCode: 'USD',
    fundingSourceToken: MARQETA_PROGRAM_FUNDING_SOURCE_TOKEN,
  };
  const userResponse = await gpa.gpaOrder(marqetaGPAOrder);
  return { user: userResponse };
};

export const createGPAorder = async (params: IMarqetaCreateGPAorder) => {
  const userResponse = await gpa.gpaOrder(params);
  return { user: userResponse };
};

export const getGPABalance = async (userToken: string) => {
  const userResponse = await gpa.getBalance(userToken);
  return { user: userResponse };
};
