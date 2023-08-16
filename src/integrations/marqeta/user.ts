import { MarqetaClient } from '../../clients/marqeta/marqetaClient';
import { User } from '../../clients/marqeta/user';
import { IRequest } from '../../types/request';
import { IMarqetaCreateUser, IMarqetaUserTransition, IMarqetaClientAccessToken } from './types';

// Instantiate the MarqetaClient
const marqetaClient = new MarqetaClient();

// Instantiate the User class
const user = new User(marqetaClient);

export const createUser = async (req: IRequest<{}, {}, IMarqetaCreateUser>) => {
  const params = { ...req.body };
  const userResponse = await user.createUser(params);
  return { data: userResponse };
};

export const listUsers = async () => {
  const userResponse = await user.listUsers();
  return { data: userResponse };
};

export const getUser = async (userToken: string) => {
  const userResponse = await user.getUser(userToken);
  return { data: userResponse };
};

export const updateUser = async (req: IRequest<{ userToken: string }, {}, IMarqetaCreateUser>) => {
  const { userToken } = req.params;
  const params = req.body;
  const userResponse = await user.updateUser(userToken, params);
  return { data: userResponse };
};

export const userTransition = async (req: IRequest<{}, {}, IMarqetaUserTransition>) => {
  const { _id: userId } = req.requestor;
  // use the userId as a marqeta userId (user_token)
  const params = { userToken: userId.toString(), ...req.body };
  const userResponse = await user.userTransition(params);
  return { data: userResponse };
};

export const listUserTransition = async (userToken: string) => {
  const userResponse = await user.listUserTransition(userToken);
  return { data: userResponse };
};

export const createClientAccessToken = async (req: IRequest<{}, {}, IMarqetaClientAccessToken>) => {
  const params = req.body;
  const userResponse = await user.createClientAccessToken(params);
  return { data: userResponse };
};

export const getClientAccessToken = async (accessToken: string) => {
  const userResponse = await user.getClientAccessToken(accessToken);
  return { data: userResponse };
};
