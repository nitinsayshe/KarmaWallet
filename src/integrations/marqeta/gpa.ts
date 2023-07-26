import { GPA } from '../../clients/marqeta/gpa';
import { MarqetaClient } from '../../clients/marqeta/marqetaClient';
import { IRequest } from '../../types/request';
import { IMarqetaCreateGPAorder } from './types';

// Instantiate the MarqetaClient
const marqetaClient = new MarqetaClient();

// Instantiate the GPA class
const gpa = new GPA(marqetaClient);

export const createGPAorder = async (req: IRequest<{}, {}, IMarqetaCreateGPAorder>) => {
  const params = req.body;
  const { _id: userId } = req.requestor;
  const userResponse = await gpa.gpaOrder({ user_token: userId, ...params });
  return { user: userResponse };
};

export const getGPABalance = async (userToken:string) => {
  const userResponse = await gpa.getBalance(userToken);
  return { user: userResponse };
};
