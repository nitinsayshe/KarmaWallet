import { MarqetaClient } from '../../clients/marqeta/marqetaClient';
import { ACHSource } from '../../clients/marqeta/accountFundingSource';
import { IRequest } from '../../types/request';
import { IMarqetaACHPlaidFundingSource } from './types';

// Instantiate the MarqetaClient
const marqetaClient = new MarqetaClient();

// Instantiate the ACH source class
const achFundingSource = new ACHSource(marqetaClient);

export const createAchFundingSource = async (req: IRequest<{}, {}, IMarqetaACHPlaidFundingSource>) => {
  const { _id: userId } = req.requestor;
  const params = req.body;
  const userResponse = await achFundingSource.createAchFundingSource({ user_token: userId, ...params });
  return { data: userResponse };
};
