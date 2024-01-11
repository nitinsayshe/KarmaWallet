import { DirectDeposit } from '../../clients/marqeta/directdeposit';
import { MarqetaClient } from '../../clients/marqeta/marqetaClient';
import { IRequest } from '../../types/request';
import { PaginatedMarqetaResponse, DirectDepositModel } from './types';

// Instantiate the MarqetaClient
const marqetaClient = new MarqetaClient();

// Instantiate the depositAccount class
const directDeposit = new DirectDeposit(marqetaClient);

export const listDirectDepositsForUser = async (req: IRequest<{}, { userToken: string }, {}>) => {
  const params = req.query;
  const deposits: Promise<PaginatedMarqetaResponse<DirectDepositModel[]>> = await directDeposit.listDirectDeposits(params);
  return { data: deposits };
};
