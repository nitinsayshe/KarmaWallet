import { MarqetaClient } from '../../clients/marqeta/marqetaClient';
import { ACHGroup } from '../../clients/marqeta/accountHolderGroup';
import { IRequest } from '../../types/request';
import { IMarqetaACHGroup } from './types';

// Instantiate the MarqetaClient
const marqetaClient = new MarqetaClient();

// Instantiate the User class
const achGroup = new ACHGroup(marqetaClient);

export const createACHGroup = async (req: IRequest<{}, {}, IMarqetaACHGroup>) => {
  const params = req.body;
  const userResponse = await achGroup.createACHGroup(params);
  return { data: userResponse };
};

export const listACHGroup = async () => {
  const userResponse = await achGroup.listACHGroup();
  return { data: userResponse };
};

export const getACHGroup = async (userToken:string) => {
  const userResponse = await achGroup.getACHGroup(userToken);
  return { data: userResponse };
};

export const updateACHGroup = async (req: IRequest<{accountGroupToken:string}, {}, IMarqetaACHGroup>) => {
  const { accountGroupToken } = req.params;
  const params = req.body;
  const userResponse = await achGroup.updateACHGroup(accountGroupToken, params);
  return { data: userResponse };
};
