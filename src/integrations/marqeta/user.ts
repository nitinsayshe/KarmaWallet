import { MarqetaClient } from '../../clients/marqeta/marqetaClient';
import { User } from '../../clients/marqeta/user';
import { IRequest } from '../../types/request';
import {
  IMarqetaCreateUser,
  IMarqetaUserTransition,
  IMarqetaClientAccessToken,
  IMarqetaLookUp,
  IMarqetaUserToken,
  GetUserByEmailResponse,
  ListUsersResponse,
  UserModel,
} from './types';

// Instantiate the MarqetaClient
const marqetaClient = new MarqetaClient();

// Instantiate the User class
const user = new User(marqetaClient);

export const createUser = async (params: IMarqetaCreateUser) => {
  const userResponse = await user.createUser(params);
  return userResponse;
};

export const listUsers = async (): Promise<ListUsersResponse> => {
  const userResponse = await user.listUsers();
  return userResponse;
};

export const getUser = async (userToken: string): Promise<UserModel> => {
  const userResponse = await user.getUser(userToken);
  return userResponse;
};

export const getUserByEmail = async (params: IMarqetaLookUp): Promise<GetUserByEmailResponse> => {
  const userResponse = await user.getUserByEmail(params);
  return userResponse;
};

export const updateUser = async (userToken: string, params: IMarqetaCreateUser) => {
  const userResponse = await user.updateUser(userToken, params);
  return userResponse;
};

export const userTransition = async (req: IRequest<{ userToken: string }, {}, IMarqetaUserTransition>) => {
  const { userToken } = req.params;
  const params = { userToken, ...req.body };
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

export const createUserAuthToken = async (req: IRequest<{}, {}, IMarqetaUserToken>) => {
  const params = req.body;
  const userResponse = await user.createUserAuthToken(params);
  return { data: userResponse };
};
