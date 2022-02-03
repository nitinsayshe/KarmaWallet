import * as User from '../services/user';
import { api, error } from '../services/output';
import { allowFields, verifyRequiredFields } from '../lib/requestData';
import { ErrorTypes, TokenTypes } from '../lib/constants';
import * as Token from '../services/token';
import { isValidEmailFormat } from '../lib/string';
import CustomError from '../lib/customError';
import { IRequestHandler } from '../types/request';

interface IUpdatePasswordBody {
  newPassword: string;
  password: string;
}

export const register: IRequestHandler<{}, {}, User.IUserData> = async (req, res) => {
  const { body } = req;
  const requiredFields = ['password', 'email', 'name', 'subscribedUpdates'];
  const { isValid, missingFields } = verifyRequiredFields(requiredFields, body);
  if (!isValid) {
    error(req, res, new CustomError(`Invalid input. Body requires the following fields: ${missingFields.join(', ')}.`, ErrorTypes.INVALID_ARG));
    return;
  }
  const {
    password, email, name, zipcode, subscribedUpdates,
  } = body;
  const { user, authKey } = await User.register(req, {
    password, email, name, zipcode, subscribedUpdates,
  });
  api(req, res, User.getSharableUser(user), authKey);
};

export const login: IRequestHandler<{}, {}, User.ILoginData> = async (req, res) => {
  // TODO: limit failed attempts w/ https://github.com/animir/node-rate-limiter-flexible/wiki/Overall-example#minimal-protection-against-password-brute-force
  const { password, email } = req.body;
  const { user, authKey } = await User.login(req, {
    password, email,
  });
  api(req, res, User.getSharableUser(user), authKey);
};

export const getProfile: IRequestHandler = async (req, res) => {
  api(req, res, User.getSharableUser(req.requestor));
};

export const logout: IRequestHandler = async (req, res) => {
  await User.logout(req, req.authKey);
  api(req, res, 'Success');
};

export const updateProfile: IRequestHandler = async (req, res) => {
  const { body } = req;
  const { _id } = req.requestor;
  const allowedFields = ['name', 'email', 'zipcode', 'subscribedUpdates'];
  const updates = allowFields(allowedFields, body);
  if (!Object.values(updates).length) {
    error(req, res, new CustomError('No valid update fields in request.'));
    return;
  }
  const user = await User.updateProfile(req, _id, updates);
  api(req, res, User.getSharableUser(user));
};

export const updatePassword: IRequestHandler<{}, {}, IUpdatePasswordBody> = async (req, res) => {
  const { newPassword, password } = req.body;
  if (!newPassword || !password) {
    error(req, res, new CustomError('New and current passwords required.', ErrorTypes.INVALID_ARG));
    return;
  }
  const user = await User.updatePassword(req, newPassword, password);
  api(req, res, User.getSharableUser(user));
};

export const createPasswordResetToken: IRequestHandler<{}, {}, User.ILoginData> = async (req, res) => {
  const { email } = req.body;
  if (!email || !isValidEmailFormat(email)) {
    error(req, res, new CustomError('Invalid email.', ErrorTypes.INVALID_ARG));
    return;
  }
  const data = await User.createPasswordResetToken(req, email);
  api(req, res, data);
};

export const checkPasswordResetToken: IRequestHandler<{}, {}, User.ILoginData> = async (req, res) => {
  const { email, token } = req.body;
  if (!token) {
    error(req, res, new CustomError('Invalid token.', ErrorTypes.AUTHENTICATION));
    return;
  }
  if (!email || !isValidEmailFormat(email)) {
    error(req, res, new CustomError('Invalid email.', ErrorTypes.AUTHENTICATION));
    return;
  }
  const user = await User.getUser(req, { email });
  if (!user) {
    error(req, res, new CustomError('Not found', ErrorTypes.NOT_FOUND));
    return;
  }
  const data = await Token.getToken(user, token, TokenTypes.Password);
  if (!data) {
    error(req, res, new CustomError('Not found', ErrorTypes.NOT_FOUND));
    return;
  }
  api(req, res, { created: data.createdOn, expires: data.expires, valid: true });
};

export const resetPasswordFromToken: IRequestHandler<{}, {}, (User.ILoginData & IUpdatePasswordBody)> = async (req, res) => {
  const { newPassword, token, email } = req.body;
  const requiredFields = ['newPassword', 'token', 'email'];
  const { isValid, missingFields } = verifyRequiredFields(requiredFields, req.body);
  if (!isValid) {
    error(req, res, new CustomError(`Invalid input. Body requires the following fields: ${missingFields.join(', ')}.`, ErrorTypes.INVALID_ARG));
    return;
  }
  if (!isValidEmailFormat(email)) {
    error(req, res, new CustomError('Invalid email.', ErrorTypes.INVALID_ARG));
    return;
  }
  const user = await User.resetPasswordFromToken(req, email, token, newPassword);
  api(req, res, User.getSharableUser(user));
};

export const sendEmailVerification: IRequestHandler = async (req, res) => {
  const data = await User.sendEmailVerification(req, req.requestor?._id);
  api(req, res, data);
};

export const verifyEmail: IRequestHandler<{}, {}, User.ILoginData> = async (req, res) => {
  const requiredFields = ['token', 'email'];
  const { isValid, missingFields } = verifyRequiredFields(requiredFields, req.body);
  if (!isValid) {
    error(req, res, new CustomError(`Invalid input. Body requires the following fields: ${missingFields.join(', ')}.`, ErrorTypes.INVALID_ARG));
    return;
  }
  const { token, email } = req.body;
  if (!isValidEmailFormat(email)) {
    error(req, res, new CustomError('Invalid email.', ErrorTypes.INVALID_ARG));
    return;
  }
  const user = await User.verifyEmail(req, email, token);
  api(req, res, User.getSharableUser(user));
};
