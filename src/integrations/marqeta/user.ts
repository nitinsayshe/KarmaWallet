import { GetPaginiatedResourceParams } from '.';
import { MarqetaClient } from '../../clients/marqeta/marqetaClient';
import { User } from '../../clients/marqeta/user';
import { IUserDocument } from '../../models/user';
import { IRequest } from '../../types/request';
import {
  IMarqetaCreateUser,
  IMarqetaUserTransition,
  IMarqetaClientAccessToken,
  IMarqetaLookUp,
  IMarqetaUserToken,
  GetUserByEmailResponse,
  ListUsersResponse,
  MarqetaUserModel,
  IMarqetaUpdateUser,
  PaginatedMarqetaResponse,
  IMarqetaUserStatus,
} from './types';

// Instantiate the MarqetaClient
const marqetaClient = new MarqetaClient(false);

// Instantiate the User class
const user = new User(marqetaClient);

export const createMarqetaUser = async (params: IMarqetaCreateUser) => {
  const userResponse = await user.createMarqetaUser(params);
  return userResponse;
};

export const listMarqetaUsers = async (): Promise<ListUsersResponse> => {
  const userResponse = await user.listMarqetaUsers();
  return userResponse;
};

export const getMarqetaUser = async (userToken: string): Promise<MarqetaUserModel> => {
  const userResponse = await user.getMarqetaUser(userToken);
  return userResponse;
};

export const getMarqetaUserByEmail = async (params: IMarqetaLookUp): Promise<GetUserByEmailResponse> => {
  const userResponse = await user.getMarqetaUserByEmail(params);
  return userResponse;
};

export const updateMarqetaUser = async (userToken: string, params: IMarqetaUpdateUser) => {
  const userResponse = await user.updateMarqetaUser(userToken, params);
  return userResponse;
};

export const userMarqetaTransition = async (req: IRequest<{ userToken: string }, {}, IMarqetaUserTransition>) => {
  const { userToken } = req.params;
  const params = { userToken, ...req.body };
  const userResponse = await user.userMarqetaTransition(params);
  return { data: userResponse };
};

export const listMarqetaUserTransition = async (userToken: string) => {
  const userResponse = await user.listMarqetaUserTransition(userToken);
  return { data: userResponse };
};

export const createMarqetaClientAccessToken = async (req: IRequest<{}, {}, IMarqetaClientAccessToken>) => {
  const params = req.body;
  const userResponse = await user.createMarqetaClientAccessToken(params);
  return { data: userResponse };
};

export const getMarqetaClientAccessToken = async (accessToken: string) => {
  const userResponse = await user.getMarqetaClientAccessToken(accessToken);
  return { data: userResponse };
};

export const createMarqetaUserAuthToken = async (req: IRequest<{}, {}, IMarqetaUserToken>) => {
  const params = req.body;
  const userResponse = await user.createMarqetaUserAuthToken(params);
  return { data: userResponse };
};

export const getUsers = async (queryParams: GetPaginiatedResourceParams): Promise<PaginatedMarqetaResponse<MarqetaUserModel[]>> => {
  const users = await user.listMarqetaUsers(queryParams);
  return users;
};

export const transitionMarqetaUserToClosed = async (userDocument: IUserDocument) => {
  try {
    const transitionUser = await user.userMarqetaTransition({
      userToken: userDocument.integrations.marqeta.userToken,
      reason: 'User requested account closure',
      reasonCode: '01',
      status: IMarqetaUserStatus.CLOSED,
      channel: 'API',
    });

    return transitionUser;
  } catch (err) {
    throw new Error('Error transitioning Marqeta user to closed');
  }
};
