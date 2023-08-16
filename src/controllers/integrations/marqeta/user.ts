import { IMarqetaClientAccessToken, IMarqetaCreateUser, IMarqetaUserTransition } from '../../../integrations/marqeta/types';
import { verifyRequiredFields } from '../../../lib/requestData';
import { IRequestHandler } from '../../../types/request';
import * as output from '../../../services/output';
import CustomError, { asCustomError } from '../../../lib/customError';
import * as UserService from '../../../integrations/marqeta/user';
import { ErrorTypes } from '../../../lib/constants';

export const createUser: IRequestHandler<{}, {}, IMarqetaCreateUser> = async (req, res) => {
  try {
    const { body } = req;
    const requiredFields = ['firstName', 'lastName', 'email', 'birthDate', 'address1', 'city', 'state', 'country', 'postalCode', 'phone', 'identifications'];
    const { isValid, missingFields } = verifyRequiredFields(requiredFields, body);
    if (!isValid) {
      output.error(req, res, new CustomError(`Invalid input. Body requires the following fields: ${missingFields.join(', ')}.`, ErrorTypes.INVALID_ARG));
      return;
    }
    const { data } = await UserService.createUser(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const listUser: IRequestHandler<{}, {}, {}> = async (req, res) => {
  try {
    const { data } = await UserService.listUsers();
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getUser: IRequestHandler<{ userToken: string }, {}, {}> = async (req, res) => {
  try {
    const { userToken } = req.params;
    const { data } = await UserService.getUser(userToken);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const updateUser: IRequestHandler<{ userToken: string }, {}, IMarqetaCreateUser> = async (req, res) => {
  try {
    const { data } = await UserService.updateUser(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const userTransition: IRequestHandler<{ userToken: string }, {}, IMarqetaUserTransition> = async (req, res) => {
  try {
    const { body } = req;
    const requiredFields = ['status', 'reasonCode', 'reason', 'channel'];
    const { isValid, missingFields } = verifyRequiredFields(requiredFields, body);
    if (!isValid) {
      output.error(req, res, new CustomError(`Invalid input. Body requires the following fields: ${missingFields.join(', ')}.`, ErrorTypes.INVALID_ARG));
      return;
    }
    const { data } = await UserService.userTransition(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const listUserTransition: IRequestHandler<{userToken:string}, {}, {}> = async (req, res) => {
  try {
    const { userToken } = req.params;
    const { data } = await UserService.listUserTransition(userToken);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const createClientAccessToken: IRequestHandler<{}, {}, IMarqetaClientAccessToken> = async (req, res) => {
  try {
    const { body } = req;
    const requiredFields = ['cardToken'];
    const { isValid, missingFields } = verifyRequiredFields(requiredFields, body);
    if (!isValid) {
      output.error(req, res, new CustomError(`Invalid input. Body requires the following fields: ${missingFields.join(', ')}.`, ErrorTypes.INVALID_ARG));
      return;
    }
    const { data } = await UserService.createClientAccessToken(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getClientAccessToken: IRequestHandler<{ accessToken: string }, {}, {}> = async (req, res) => {
  try {
    const { accessToken } = req.params;
    const { data } = await UserService.getClientAccessToken(accessToken);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
