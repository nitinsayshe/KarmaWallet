import { DepositAccount } from '../../clients/marqeta/depositAccount';
import { MarqetaClient } from '../../clients/marqeta/marqetaClient';
import { IRequest } from '../../types/request';
import { IMarqetaDepositAccount } from './types';
import CustomError from '../../lib/customError';
import { ErrorTypes } from '../../lib/constants';

// Instantiate the MarqetaClient
const marqetaClient = new MarqetaClient();

// Instantiate the depositAccount class
const depositAccount = new DepositAccount(marqetaClient);

export const createDepositAccount = async (req: IRequest<{}, {}, IMarqetaDepositAccount>) => {
  const { userToken } = req.requestor.integrations.marqeta;
  if (!userToken) {
    throw new CustomError('userToken for marqeta user not found', ErrorTypes.NOT_FOUND);
  }
  const params = { userToken, ...req.body };
  const data = await depositAccount.createDepositAccount(params);
  return { data };
};
