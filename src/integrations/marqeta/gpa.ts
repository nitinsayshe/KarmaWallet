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
  const responseMessage = '';
  const userResponse = await gpa.gpaOrder(params);
  return { message: responseMessage, user: userResponse };
};

export const getGPABalance = async (userToken:string) => {
  const responseMessage = '';
  const userResponse = await gpa.getBalance(userToken);
  return { message: responseMessage, user: userResponse };
};
