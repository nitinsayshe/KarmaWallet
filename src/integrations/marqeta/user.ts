import { GetPaginiatedResourceParams } from '.';
import { MarqetaClient } from '../../clients/marqeta/marqetaClient';
import { MarqetaChannelEnum, MarqetaReasonCodeEnumValues } from '../../clients/marqeta/types';
import { User } from '../../clients/marqeta/user';
import { IUserDocument } from '../../models/user';
import { IVisitorDocument } from '../../models/visitor';
import { IEntityData } from '../../services/user/types';
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
const marqetaClient = new MarqetaClient();

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

export const transitionMarqetaUser = async (transitionData: IMarqetaUserTransition) => {
  const userResponse = await user.userMarqetaTransition(transitionData);
  return userResponse;
};

export const updateMarqetaUserStatus = async (entity: IUserDocument | IVisitorDocument, status: IMarqetaUserStatus, reasonCode?: MarqetaReasonCodeEnumValues) => {
  try {
    if (!entity?.integrations?.marqeta?.userToken) {
      throw new Error('User does not have a Marqeta user token');
    }
    if (entity.integrations.marqeta.status === status) {
      throw new Error('User is already in the requested status');
    }

    const mockRequest = {
      params: { userToken: entity.integrations.marqeta.userToken },
      body: {
        status,
        channel: MarqetaChannelEnum.API,
        reasonCode: reasonCode || '01',
      },
      requestor: {},
      authKey: '',
    } as IRequest<{ userToken: string }, {}, IMarqetaUserTransition>;
    await userMarqetaTransition(mockRequest);
  } catch (error) {
    console.log('Error updating user status to suspended', error);
  }
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

// Will occur when someone manually marks an inquiry/user as declined
export const closeMarqetaAccount = async (entityData: IEntityData) => {
  try {
    const marqetaUserToken = entityData?.data?.integrations?.marqeta?.userToken;
    if (marqetaUserToken) {
      throw new Error('User does not have a Marqeta user token');
    }

    const userInMarqeta = await getMarqetaUser(marqetaUserToken);
    if (userInMarqeta) {
      console.log(`Found user in Marqeta with id: ${marqetaUserToken}`);
      // update user status in marqeta
      if (userInMarqeta.state !== IMarqetaUserStatus.CLOSED) {
        await transitionMarqetaUser({
          channel: 'API',
          reason: 'Manual Review: Failed KYC',
          reasonCode: '17',
          status: IMarqetaUserStatus.CLOSED,
          userToken: marqetaUserToken,
        });
      }
    } else {
      console.log(`No user found in Marqeta with id: ${marqetaUserToken}`);
    }
  } catch (err) {
    console.log(`Error closing Marqeta account for user or visitor with id ${entityData.data._id.toString()}`, err);
  }
};
