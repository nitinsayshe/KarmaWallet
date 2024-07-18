import { GetPaginiatedResourceParams } from '..';
import { MarqetaClient } from '../../../clients/marqeta/marqetaClient';
import { MarqetaChannelEnum, MarqetaReasonCodeEnumValues } from '../../../clients/marqeta/types';
import { User } from '../../../clients/marqeta/user';
import { IUserDocument, UserModel } from '../../../models/user';
import { IVisitorDocument } from '../../../models/visitor';
import { IEntityData } from '../../../services/user/types';
import { IRequest } from '../../../types/request';
import { GetUserByEmailResponse, IMarqetaClientAccessToken, ListUsersResponse, PaginatedMarqetaResponse } from '../types';
import {
  IMarqetaCreateUser,
  IMarqetaUserTransition,
  IMarqetaUserToken,
  MarqetaUserModel,
  IMarqetaUpdateUser,
  IMarqetaUserStatus,
  NonClosedMarqetaUserStatus,
  IMarqetaLookUp,
} from './types';

export const createMarqetaUser = async (params: IMarqetaCreateUser) => {
  const marqetaClient = new MarqetaClient();
  const user = new User(marqetaClient);
  const userResponse = await user.createMarqetaUser(params);
  return userResponse;
};

export const listMarqetaUsers = async (): Promise<ListUsersResponse> => {
  const marqetaClient = new MarqetaClient();
  const user = new User(marqetaClient);
  const userResponse = await user.listMarqetaUsers();
  return userResponse;
};

export const getMarqetaUser = async (userToken: string): Promise<MarqetaUserModel> => {
  const marqetaClient = new MarqetaClient();
  const user = new User(marqetaClient);
  const userResponse = await user.getMarqetaUser(userToken);
  return userResponse;
};

export const getMarqetaUserByEmail = async (params: IMarqetaLookUp): Promise<GetUserByEmailResponse> => {
  const marqetaClient = new MarqetaClient();
  const user = new User(marqetaClient);
  const userResponse = await user.getMarqetaUserByEmail(params);
  return userResponse;
};

export const updateMarqetaUser = async (userToken: string, params: IMarqetaUpdateUser) => {
  const marqetaClient = new MarqetaClient();
  const user = new User(marqetaClient);
  const userResponse = await user.updateMarqetaUser(userToken, params);
  return userResponse;
};

export const userMarqetaTransition = async (req: IRequest<{ userToken: string }, {}, IMarqetaUserTransition>) => {
  const marqetaClient = new MarqetaClient();
  const user = new User(marqetaClient);
  const { userToken } = req.params;
  const params = { userToken, ...req.body };
  const userResponse = await user.userMarqetaTransition(params);
  return { data: userResponse };
};

export const transitionMarqetaUser = async (transitionData: IMarqetaUserTransition) => {
  const marqetaClient = new MarqetaClient();
  const user = new User(marqetaClient);
  const currentUserInMarqeta = await user.getMarqetaUser(transitionData.userToken);
  if (currentUserInMarqeta.status === transitionData.status) {
    console.log(`User is already in status ${transitionData.status}`);
    return currentUserInMarqeta;
  }
  const userResponse = await user.userMarqetaTransition(transitionData);
  return userResponse;
};

export const transitionMarqetaUserToClosed = async (userDocument: IUserDocument) => {
  try {
    const marqetaClient = new MarqetaClient();
    const user = new User(marqetaClient);
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

// This function won't take the CLOSED status as a parameter because in that case we
// should also update the user's email and remove the Marqeta integration
// setClosedEmailAndStatusAndRemoveMarqetaIntegration() would handle that
export const updateMarqetaUserStatus = async (
  entity: IUserDocument | IVisitorDocument,
  status: NonClosedMarqetaUserStatus,
  reasonCode: MarqetaReasonCodeEnumValues,
  reason?: string,
) => {
  try {
    if (!entity?.integrations?.marqeta?.userToken) {
      throw new Error('User does not have a Marqeta user token');
    }

    const marqetaClient = new MarqetaClient();
    const userClient = new User(marqetaClient);
    const userInMarqeta = await userClient.getMarqetaUser(entity.integrations.marqeta.userToken);

    if (status === userInMarqeta.status) {
      console.log(`User is already in status ${status}`);
      return;
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

    if (!reason) mockRequest.body.reason = reason;
    await userMarqetaTransition(mockRequest);
  } catch (error) {
    console.log(`[X] Error updating user status to ${status}`, error);
  }
};

export const listMarqetaUserTransition = async (userToken: string) => {
  const marqetaClient = new MarqetaClient();
  const user = new User(marqetaClient);
  const userResponse = await user.listMarqetaUserTransition(userToken);
  return { data: userResponse };
};

export const createMarqetaClientAccessToken = async (req: IRequest<{}, {}, IMarqetaClientAccessToken>) => {
  const params = req.body;
  const marqetaClient = new MarqetaClient();
  const user = new User(marqetaClient);
  const userResponse = await user.createMarqetaClientAccessToken(params);
  return { data: userResponse };
};

export const getMarqetaClientAccessToken = async (accessToken: string) => {
  const marqetaClient = new MarqetaClient();
  const user = new User(marqetaClient);
  const userResponse = await user.getMarqetaClientAccessToken(accessToken);
  return { data: userResponse };
};

export const createMarqetaUserAuthToken = async (req: IRequest<{}, {}, IMarqetaUserToken>) => {
  const params = req.body;
  const marqetaClient = new MarqetaClient();
  const user = new User(marqetaClient);
  const userResponse = await user.createMarqetaUserAuthToken(params);
  return { data: userResponse };
};

export const getUsers = async (queryParams: GetPaginiatedResourceParams): Promise<PaginatedMarqetaResponse<MarqetaUserModel[]>> => {
  const marqetaClient = new MarqetaClient();
  const user = new User(marqetaClient);
  const users = await user.listMarqetaUsers(queryParams);
  return users;
};

export const checkIfUserActiveInMarqeta = async (userId: string) => {
  const user = await UserModel.findById(userId);
  if (!user) console.log(`[+] No User found with this id ${userId}`);
  const { status } = await getMarqetaUser(user.integrations.marqeta.userToken);
  if (status === IMarqetaUserStatus.ACTIVE || status === IMarqetaUserStatus.LIMITED) return true;
  return false;
};

// If the closing of account is coming from somewhere outside of Marqeta we want to make sure that we update their status in Marqeta accordingly
export const closeMarqetaAccount = async (entityData: IEntityData) => {
  try {
    const marqetaUserToken = entityData?.data?.integrations?.marqeta?.userToken;
    if (marqetaUserToken) {
      console.log('/////// User does not have a Marqeta token anymore, skipping closing API call to Marqeta ///////');
      return;
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
