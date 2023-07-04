import { MarqetaClient } from '../../clients/marqeta/marqetaClient';
import { User } from '../../clients/marqeta/user';
import { IRequest } from '../../types/request';
import { IMarqetaCreateUser } from './types';

// Instantiate the MarqetaClient
const marqetaClient = new MarqetaClient();

// Instantiate the User class
const user = new User(marqetaClient);

export const createUser = async (req: IRequest<{}, {}, IMarqetaCreateUser>) => {
  const params = req.body;
  const responseMessage = '';
  const userResponse = await user.createUser(params);
  return { message: responseMessage, user: userResponse };
};

export const listUsers = async () => {
  const responseMessage = '';
  const userResponse = await user.listUsers();
  return { message: responseMessage, user: userResponse };
};
