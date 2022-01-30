import argon2 from 'argon2';
import { IUser, IUserGroup, UserModel } from '../../models/user';
import CustomError, { asCustomError } from '../../lib/customError';
import * as Session from '../session';
import {
  TokenTypes, passwordResetTokenMinutes, emailVerificationDays, ErrorTypes, UserRoles, ZIPCODE_REGEX,
} from '../../lib/constants';
import * as Token from '../token';
import { IRequest } from '../../types/request';
import { isValidEmailFormat } from '../../lib/string';
import { validatePassword } from './utils/validate';

export interface ILoginData {
  email: string;
  password?: string;
  token?: string;
}

export interface IUserData extends ILoginData {
  name: string;
  zipcode: string;
  subscribedUpdates: boolean;
  role?: UserRoles;
  groups?: IUserGroup[];
}

export const register = async (req: IRequest, {
  password,
  email,
  name,
  zipcode,
  subscribedUpdates,
}: IUserData) => {
  try {
    if (!password) throw new CustomError('A password is required.', ErrorTypes.INVALID_ARG);
    if (!name) throw new CustomError('A name is required.', ErrorTypes.INVALID_ARG);
    if (!email) throw new CustomError('A email is required.', ErrorTypes.INVALID_ARG);

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      throw new CustomError(`Invalid password. ${passwordValidation.message}`, ErrorTypes.INVALID_ARG);
    }
    const hash = await argon2.hash(password);
    const emailExists = await UserModel.findOne({ email });
    if (emailExists) {
      throw new CustomError('Email already in use.', ErrorTypes.CONFLICT);
    }

    if (!!zipcode && !ZIPCODE_REGEX.test(zipcode)) throw new CustomError('Invalid zipcode found.', ErrorTypes.INVALID_ARG);

    const userInstance = new UserModel({
      name,
      email,
      password: hash,
      subscribedUpdates,
      zipcode,
      role: UserRoles.None,
      groups: [],
    });

    const user = await userInstance.save();
    const authKey = await Session.createSession(user._id);
    return { user, authKey };
  } catch (err) {
    throw asCustomError(err);
  }
};

export const login = async (_: IRequest, { email, password }: ILoginData) => {
  const user = await UserModel.findOne({ email }).lean();
  if (!user) {
    throw new CustomError('Invalid email or password', ErrorTypes.INVALID_ARG);
  }
  const passwordMatch = await argon2.verify(user.password, password);
  if (!passwordMatch) {
    throw new CustomError('Invalid email or password', ErrorTypes.INVALID_ARG);
  }
  const authKey = await Session.createSession(user._id);
  return { user, authKey };
};

export const getUsers = async (_: IRequest, query = {}, lean = false) => {
  try {
    return !!lean
      ? await UserModel.find(query).lean()
      : await UserModel.find(query);
  } catch (err) {
    throw asCustomError(err);
  }
};

export const getUser = async (_: IRequest, query = {}, lean = false) => {
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

export const getUserById = async (_: IRequest, uid: string, lean: boolean) => {
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

export const logout = async (_: IRequest, authKey: string) => {
  await Session.revokeSession(authKey);
};

export const updateUser = async (_: IRequest, uid: string, updates: Partial<IUser>) => {
  try {
    return await UserModel.findByIdAndUpdate(uid, { ...updates, lastModified: new Date() }, { new: true });
  } catch (err) {
    throw asCustomError(err);
  }
};

const changePassword = async (req: IRequest, uid: string, newPassword: string) => {
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.valid) {
    throw new CustomError(`Invalid new password. ${passwordValidation.message}`, ErrorTypes.INVALID_ARG);
  }
  const hash = await argon2.hash(newPassword);
  const user = await updateUser(req, uid, { password: hash });
  return user;
};

export const updateProfile = async (req: IRequest, uid: string, updates: Partial<IUser>) => {
  if (updates?.email) {
    if (!isValidEmailFormat(updates.email)) {
      throw new CustomError('Invalid email', ErrorTypes.INVALID_ARG);
    }
    updates.emailVerified = false;
  }
  return updateUser(req, uid, updates);
};

export const updatePassword = async (req: IRequest, newPassword: string, currentPassword: string) => {
  const passwordMatch = await argon2.verify(req.requestor.password, currentPassword);
  if (!passwordMatch) {
    throw new CustomError('Invalid password', ErrorTypes.INVALID_ARG);
  }
  const user = await changePassword(req, req.requestor._id, newPassword);
  return user;
};

export const createPasswordResetToken = async (_: IRequest, email: string) => {
  const minutes = passwordResetTokenMinutes;
  const user = await UserModel.findOne({ email }, '_id');
  if (user) {
    await Token.createToken({ user: user._id, minutes, type: TokenTypes.Password });
  }
  // TODO: Send Email
  const message = `An email has been sent to the email address you provided with further instructions. Your reset request will expire in ${passwordResetTokenMinutes} minutes.`;
  return { message };
};

export const resetPasswordFromToken = async (req: IRequest, email: string, value: string, password: string) => {
  const errMsg = 'Token not found. Please request password reset again.';
  const user = await UserModel.findOne({ email }, '_id');
  if (!user) {
    throw new CustomError(errMsg, ErrorTypes.AUTHENTICATION);
  }
  const token = await Token.getTokenAndConsume(user._id, value, TokenTypes.Password);
  if (!token) {
    throw new CustomError(errMsg, ErrorTypes.AUTHENTICATION);
  }
  const _user = await changePassword(req, user._id, password);
  return _user;
};

export const sendEmailVerification = async (_: IRequest, uid: string) => {
  const days = emailVerificationDays;
  const msg = `Verfication instructions sent to your provided email address. Validation will expire in ${days} days.`;
  await Token.createToken({ user: uid, days, type: TokenTypes.Email });
  // TODO: Send Email'
  return msg;
};

export const verifyEmail = async (req: IRequest, email: string, token: string) => {
  const errMsg = 'Token not found. Please request email verification again.';
  const user = await getUser(req, { email });
  if (!user) {
    throw new CustomError(errMsg, ErrorTypes.AUTHENTICATION);
  }
  const tokenData = await Token.getTokenAndConsume(user._id, token, TokenTypes.Email);
  if (!tokenData) {
    throw new CustomError(errMsg, ErrorTypes.AUTHENTICATION);
  }
  return updateUser(req, user._id, { emailVerified: true });
};
