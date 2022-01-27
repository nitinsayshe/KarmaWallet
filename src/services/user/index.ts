import argon2 from 'argon2';
import { IUser, UserModel } from '../../mongo/model/user';
import CustomError, { asCustomError } from '../../lib/customError';
import * as Session from '../session';
import * as UserDb from './db';
import {
  TokenTypes, passwordResetTokenMinutes, emailVerificationDays, ErrorTypes,
} from '../../lib/constants';
import * as Token from '../token';
import { IRequest } from '../../types/request';
import { isValidEmailFormat } from '../../lib/string';

export const register = async (req: IRequest, {
  password,
  email,
  name,
  zipcode,
  subscribedUpdates,
}: UserDb.ICreateUserData) => {
  const user = await UserDb.create({
    password,
    email,
    name,
    zipcode,
    subscribedUpdates,
  });
  const authKey = await Session.create(user._id);
  return { user, authKey };
};

export const login = async (_: IRequest, { email, password }: UserDb.ILoginData) => {
  const user = await UserModel.findOne({ email }).lean();
  if (!user) {
    throw new CustomError('Invalid email or password', ErrorTypes.INVALID_ARG);
  }
  const passwordMatch = await argon2.verify(user.password, password);
  if (!passwordMatch) {
    throw new CustomError('Invalid email or password', ErrorTypes.INVALID_ARG);
  }
  const authKey = await Session.create(user._id);
  return { user, authKey };
};

export const find = async (_: IRequest, query = {}, lean = false) => {
  try {
    return !!lean
      ? await UserModel.find(query).lean()
      : await UserModel.find(query);
  } catch (err) {
    throw asCustomError(err);
  }
};

export const findOne = async (_: IRequest, query = {}, lean = false) => {
  try {
    const user = !!lean
      ? await UserModel.findOne(query).lean()
      : await UserModel.findOne(query);

    if (!user) throw new CustomError('User not found', ErrorTypes.NOT_FOUND);

    return user;
  } catch (err) {
    throw asCustomError(err);
  }
};

export const findById = async (_: IRequest, uid: string, lean: boolean) => {
  try {
    const user = !!lean
      ? await UserModel.findById({ _id: uid }).lean()
      : await UserModel.findById({ _id: uid });

    if (!user) throw new CustomError('User not found', ErrorTypes.NOT_FOUND);

    return user;
  } catch (err) {
    throw asCustomError(err);
  }
};

export const getSharableUser = (user: IUser) => ({
  _id: user._id,
  email: user.email,
  name: user.name,
  dateJoined: user.dateJoined,
  zipcode: user?.zipcode || null,
  subscribedUpdates: user.subscribedUpdates,
  role: user.role,
  groups: user.groups,
});

/**
 * @param {string} authKey
 */
export const logout = async (_: IRequest, authKey: string) => {
  await Session.revoke(authKey);
};

/**
 *
 * @param {Express.Request} req
 * @param {string} uid
 * @param {Object} updates
 * @returns {UserProfile}
 */
export const updateProfile = async (req: IRequest, uid: string, updates: Partial<IUser>) => {
  if (updates?.email) {
    if (!isValidEmailFormat(updates.email)) {
      throw new CustomError('Invalid email', ErrorTypes.INVALID_ARG);
    }
    updates.emailVerified = false;
  }
  const user = await UserDb.findByIdAndUpdate(uid, updates);
  return user;
};

/**
 *
 * @param {Express.Request} req
 * @param {string} newPassword
 * @param {string} currentPassword
 * @returns {UserProfile}
 */
export const updatePassword = async (req: IRequest, newPassword: string, currentPassword: string) => {
  const passwordMatch = await argon2.verify(req.requestor.password, currentPassword);
  if (!passwordMatch) {
    throw new CustomError('Invalid password', ErrorTypes.INVALID_ARG);
  }
  const user = await UserDb.changePassword(req.requestor._id, newPassword);
  return user;
};

export const createPasswordResetToken = async (_: IRequest, email: string) => {
  const minutes = passwordResetTokenMinutes;
  const user = await UserModel.findOne({ email }, '_id');
  if (user) {
    await Token.create({ user: user._id, minutes, type: TokenTypes.Password });
  }
  // TODO: Send Email
  const message = `An email has been sent to the email address you provided with further instructions. Your reset request will expire in ${passwordResetTokenMinutes} minutes.`;
  return { message };
};

export const resetPasswordFromToken = async (_: IRequest, email: string, value: string, password: string) => {
  const errMsg = 'Token not found. Please request password reset again.';
  const user = await UserModel.findOne({ email }, '_id');
  if (!user) {
    throw new CustomError(errMsg, ErrorTypes.AUTHENTICATION);
  }
  const token = await Token.findOneAndConsume(user._id, value, TokenTypes.Password);
  if (!token) {
    throw new CustomError(errMsg, ErrorTypes.AUTHENTICATION);
  }
  const _user = await UserDb.changePassword(user._id, password);
  return _user;
};

export const sendEmailVerification = async (_: IRequest, uid: string) => {
  const days = emailVerificationDays;
  const msg = `Verfication instructions sent to your provided email address. Validation will expire in ${days} days.`;
  await Token.create({ user: uid, days, type: TokenTypes.Email });
  // TODO: Send Email'
  return msg;
};

export const verifyEmail = async (req: IRequest, email: string, token: string) => {
  const errMsg = 'Token not found. Please request email verification again.';
  const user = await findOne(req, { email });
  if (!user) {
    throw new CustomError(errMsg, ErrorTypes.AUTHENTICATION);
  }
  const tokenData = await Token.findOneAndConsume(user._id, token, TokenTypes.Email);
  if (!tokenData) {
    throw new CustomError(errMsg, ErrorTypes.AUTHENTICATION);
  }
  const _user = await UserDb.findByIdAndUpdate(user._id, { emailVerified: true });
  return _user;
};
