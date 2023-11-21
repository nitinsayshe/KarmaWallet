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

  // get the program funding source balance
  const programFundingResponse = await gpa.getProgramFundingBalance();

  if (process.env.MARQETA !== 'immxmgr_sandbox' && programFundingResponse?.available_balance < amount) {
    throw new CustomError('Program funding source balance is not enough to make a cashBack !', ErrorTypes.UNPROCESSABLE);
  }
  // find the user in DB
  const userData = await UserModel.findById(userId);

  if (!userData || !userData.integrations?.marqeta?.userToken) {
    throw new CustomError(!userData ? 'User not found' : 'Marqeta userToken not found', ErrorTypes.NOT_FOUND);
  }
  // format the marqeta GPA order payload
  const marqetaGPAOrder: IMarqetaCreateGPAorder = {
    userToken: userData.integrations.marqeta.userToken,
    amount,
    currencyCode: 'USD',
    fundingSourceToken: MARQETA_PROGRAM_FUNDING_SOURCE_TOKEN,
  };
  const gpaOrderResponse = await gpa.gpaOrder(marqetaGPAOrder);
  return { data: gpaOrderResponse };
};

// load funds to user GPA from program funding Source
export const createGPAorder = async (params: IMarqetaCreateGPAorder) => {
  const response = await gpa.gpaOrder(params);
  return { data: response };
};

// get user GPA balance
export const getGPABalance = async (userToken: string) => {
  const response = await gpa.getBalance(userToken);
  return { data: response };
};

// get program funding balance
export const getProgramFundingBalance = async () => {
  const response = await gpa.getProgramFundingBalance();
  return { data: response };
};
