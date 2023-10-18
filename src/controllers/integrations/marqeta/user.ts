import { IMarqetaClientAccessToken, IMarqetaCreateUser, IMarqetaUpdateUser, IMarqetaUserToken, IMarqetaUserTransition } from '../../../integrations/marqeta/types';
import { verifyRequiredFields } from '../../../lib/requestData';
import { IRequestHandler } from '../../../types/request';
import * as output from '../../../services/output';
import CustomError, { asCustomError } from '../../../lib/customError';
import * as UserService from '../../../integrations/marqeta/user';
import { ErrorTypes } from '../../../lib/constants';

export const createMarqetaUser: IRequestHandler<{}, {}, IMarqetaCreateUser> = async (req, res) => {
  try {
    const { body } = req;
    const requiredFields = ['firstName', 'lastName', 'email', 'birthDate', 'address1', 'city', 'state', 'country', 'postalCode', 'phone', 'identifications'];
    const { isValid, missingFields } = verifyRequiredFields(requiredFields, body);
    if (!isValid) {
      output.error(req, res, new CustomError(`Invalid input. Body requires the following fields: ${missingFields.join(', ')}.`, ErrorTypes.INVALID_ARG));
      return;
    }
    const { data } = await UserService.createMarqetaUser(body);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const listMarqetaUser: IRequestHandler<{}, {}, {}> = async (req, res) => {
  try {
    const { data } = await UserService.listMarqetaUsers();
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getMarqetaUser: IRequestHandler<{ userToken: string }, {}, {}> = async (req, res) => {
  try {
    const { userToken } = req.params;
    const data = await UserService.getMarqetaUser(userToken);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const updateMarqetaUser: IRequestHandler<{ userToken: string }, {}, IMarqetaUpdateUser> = async (req, res) => {
  try {
    const { userToken } = req.params;
    const { body } = req;
    // TODO: check if the response body has a 'data' field
    // https://www.marqeta.com/docs/core-api/users#putUsersToken
    const { data } = await UserService.updateMarqetaUser(userToken, body);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const userMarqetaTransition: IRequestHandler<{ userToken: string }, {}, IMarqetaUserTransition> = async (req, res) => {
  try {
    const { body } = req;
    const requiredFields = ['status', 'reasonCode', 'reason', 'channel'];
    const { isValid, missingFields } = verifyRequiredFields(requiredFields, body);
    if (!isValid) {
      output.error(req, res, new CustomError(`Invalid input. Body requires the following fields: ${missingFields.join(', ')}.`, ErrorTypes.INVALID_ARG));
      return;
    }
    // TODO: check if the response body has a 'data' field
    const { data } = await UserService.userMarqetaTransition(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const listMarqetaUserTransition: IRequestHandler<{ userToken: string }, {}, {}> = async (req, res) => {
  try {
    const { userToken } = req.params;
    // TODO: check if the response body has a 'data' field
    const { data } = await UserService.listMarqetaUserTransition(userToken);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const createMarqetaClientAccessToken: IRequestHandler<{}, {}, IMarqetaClientAccessToken> = async (req, res) => {
  try {
    const { body } = req;
    const requiredFields = ['cardToken'];
    const { isValid, missingFields } = verifyRequiredFields(requiredFields, body);
    if (!isValid) {
      output.error(req, res, new CustomError(`Invalid input. Body requires the following fields: ${missingFields.join(', ')}.`, ErrorTypes.INVALID_ARG));
      return;
    }
    // TODO: check if the response body has a 'data' field
    const { data } = await UserService.createMarqetaClientAccessToken(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getMarqetaClientAccessToken: IRequestHandler<{ accessToken: string }, {}, {}> = async (req, res) => {
  try {
    const { accessToken } = req.params;
    // TODO: check if the response body has a 'data' field
    const { data } = await UserService.getMarqetaClientAccessToken(accessToken);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const createMarqetaUserAuthToken: IRequestHandler<{}, {}, IMarqetaUserToken> = async (req, res) => {
  try {
    const { body } = req;
    const requiredFields = ['userToken'];
    const { isValid, missingFields } = verifyRequiredFields(requiredFields, body);
    if (!isValid) {
      output.error(req, res, new CustomError(`Invalid input. Body requires the following fields: ${missingFields.join(', ')}.`, ErrorTypes.INVALID_ARG));
      return;
    }
    // TODO: check if the response body has a 'data' field
    const { data } = await UserService.createMarqetaUserAuthToken(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
