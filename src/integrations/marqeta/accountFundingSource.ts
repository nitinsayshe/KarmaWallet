import { MarqetaClient } from '../../clients/marqeta/marqetaClient';
import { ACHSource } from '../../clients/marqeta/accountFundingSource';
import { IRequest } from '../../types/request';
import { IMarqetaACHPlaidFundingSource } from './types';

// Instantiate the MarqetaClient
const marqetaClient = new MarqetaClient();

// Instantiate the ACH FUNDING source class
const achFundingSource = new ACHSource(marqetaClient);

export const createAchFundingSource = async (req: IRequest<{}, {}, IMarqetaACHPlaidFundingSource>) => {
  const { _id: userId } = req.requestor;
  const params = { userToken: userId.toString(), ...req.body };
  const userResponse = await achFundingSource.createAchFundingSource(params);
  return { data: userResponse };
};
