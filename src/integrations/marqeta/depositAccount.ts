import { DepositAccount } from '../../clients/marqeta/depositAccount';
import { MarqetaClient } from '../../clients/marqeta/marqetaClient';
import { IRequest } from '../../types/request';
import { IMarqetaUserToken } from './types';

// Instantiate the MarqetaClient
const marqetaClient = new MarqetaClient();

// Instantiate the depositAccount class
const depositAccount = new DepositAccount(marqetaClient);

export const createDepositAccount = async (req: IRequest<{}, {}, IMarqetaUserToken>) => {
  const params = req.body;
  const responseMessage = '';
  const userResponse = await depositAccount.createDepositAccount(params);
  return { message: responseMessage, user: userResponse };
};

export const listDepositAccount = async (userToken:string) => {
  const responseMessage = '';
  const userResponse = await depositAccount.listDepositAccount(userToken);
  return { message: responseMessage, user: userResponse };
};
