import argon2 from 'argon2';
import { nanoid } from 'nanoid';
import { FilterQuery } from 'mongoose';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import {
  IUser, IUserDocument, UserEmailStatus, UserModel,
} from '../../models/user';
import CustomError, { asCustomError } from '../../lib/customError';
import * as Session from '../session';
import {
  TokenTypes, passwordResetTokenMinutes, ErrorTypes, UserRoles,
} from '../../lib/constants';
import * as TokenService from '../token';
import { IRequest } from '../../types/request';
import { isValidEmailFormat } from '../../lib/string';
import { validatePassword } from './utils/validate';
import { LegacyUserModel } from '../../models/legacyUser';
import { ZIPCODE_REGEX } from '../../lib/constants/regex';
import { resendEmailVerification } from './verification';
import { sendWelcomeEmail } from '../email';

dayjs.extend(utc);

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
}

export interface IEmailVerificationData {
  email: string;
  code: string;
  tokenValue: string;
}

type UserKeys = keyof IUser;

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
    const emailExists = await UserModel.findOne({ 'emails.email': email });
    if (emailExists) {
      throw new CustomError('Email already in use.', ErrorTypes.CONFLICT);
    }

    if (!!zipcode && !ZIPCODE_REGEX.test(zipcode)) throw new CustomError('Invalid zipcode found.', ErrorTypes.INVALID_ARG);

    // TODO: delete creating a new legacy user when able.
    const legacyUser = new LegacyUserModel({
      _id: nanoid(),
      name,
      email,
      password: hash,
      subscribedUpdates,
      zipcode,
      role: UserRoles.None,
    });

    await legacyUser.save();

    // map new legacy user to new user
    const rawUser = {
      ...legacyUser.toObject(),
      emails: [{ email, verified: false, primary: true }],
      legacyId: legacyUser._id,
    };

    delete rawUser._id;
    const newUser = new UserModel({ ...rawUser });
    await newUser.save();

    const authKey = await Session.createSession(newUser._id.toString());

    const verificationEmailRequest = { ...req, requestor: newUser, body: { email } };
    await Promise.all([
      resendEmailVerification(verificationEmailRequest),
      sendWelcomeEmail({ name: newUser.name, recipientEmail: email }),
    ]);

    return { user: newUser, authKey };
  } catch (err) {
    throw asCustomError(err);
  }
};

export const login = async (_: IRequest, { email, password }: ILoginData) => {
  const user = await UserModel.findOne({ 'emails.email': email });
  if (!user) {
    throw new CustomError('Invalid email or password', ErrorTypes.INVALID_ARG);
  }
  const passwordMatch = await argon2.verify(user.password, password);
  if (!passwordMatch) {
    throw new CustomError('Invalid email or password', ErrorTypes.INVALID_ARG);
  }
  const authKey = await Session.createSession(user._id.toString());
  return { user, authKey };
};

export const getUsers = (_: IRequest, query: FilterQuery<IUser>) => {
  const options = {
    projection: query?.projection || '',
    populate: query.population || [],
    lean: true,
    page: query?.skip || 1,
    sort: query?.sort ? { ...query.sort, _id: 1 } : { name: 1, _id: 1 },
    limit: query?.limit || 10,
  };

  return UserModel.paginate(query.filter, options);
};

export const getUser = async (_: IRequest, query = {}) => {
  try {
    const user = await UserModel
      .findOne(query);

    if (!user) throw new CustomError('User not found', ErrorTypes.NOT_FOUND);

    return user;
  } catch (err) {
    throw asCustomError(err);
  }
};

export const getUserById = async (_: IRequest, uid: string) => {
  try {
    const user = await UserModel
      .findById({ _id: uid });

    if (!user) throw new CustomError('User not found', ErrorTypes.NOT_FOUND);

    return user;
  } catch (err) {
    throw asCustomError(err);
  }
};

export const getShareableUser = ({
  _id,
  email,
  emails,
  name,
  dateJoined,
  zipcode,
  subscribedUpdates,
  role,
  legacyId,
}: IUserDocument) => ({
  _id,
  email,
  emails,
  name,
  dateJoined,
  zipcode,
  subscribedUpdates,
  role,
  legacyId,
});

export const logout = async (_: IRequest, authKey: string) => {
  await Session.revokeSession(authKey);
};

export const updateUser = async (_: IRequest, user: IUserDocument, updates: Partial<IUser>) => {
  try {
    return await UserModel.findByIdAndUpdate(user._id, { ...updates, lastModified: dayjs().utc().toDate() }, { new: true });
  } catch (err) {
    throw asCustomError(err);
  }
};

const changePassword = async (req: IRequest, user: IUserDocument, newPassword: string) => {
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.valid) {
    throw new CustomError(`Invalid new password. ${passwordValidation.message}`, ErrorTypes.INVALID_ARG);
  }
  const hash = await argon2.hash(newPassword);
  return updateUser(req, user, { password: hash });
};

export const updateProfile = async (req: IRequest, uid: string, updates: Partial<IUser>) => {
  const user = await UserModel.findOne({ _id: uid });
  if (!user) throw new CustomError('User not found', ErrorTypes.NOT_FOUND);
  if (updates?.email && isValidEmailFormat(updates.email)) {
    const existingEmail = user.emails.find(email => email.email === updates.email);
    if (!existingEmail) {
      user.emails.map(email => ({ ...email, primary: false }));
      user.emails.push({ email: updates.email, status: UserEmailStatus.Unverified, primary: true });
      // TODO: Send verification email
    } else {
      user.emails.map(email => ({ ...email, primary: updates.email === email.email }));
    }
  }
  const allowedFields: UserKeys[] = ['name', 'zipcode', 'subscribedUpdates'];
  // TODO: find solution to allow dynamic setting of fields
  for (const key of allowedFields) {
    switch (key) {
      case 'name':
        user.name = updates.name;
        break;
      case 'zipcode':
        user.zipcode = updates.zipcode;
        break;
      case 'subscribedUpdates':
        user.subscribedUpdates = updates.subscribedUpdates;
        break;
      default:
        break;
    }
  }
  await user.save();
  return user;
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
  const user = await UserModel.findOne({ 'emails.email': email });
  if (user) {
    await TokenService.createToken({ user, minutes, type: TokenTypes.Password });
  }
  // TODO: Send Email
  const message = `An email has been sent to the email address you provided with further instructions. Your reset request will expire in ${passwordResetTokenMinutes} minutes.`;
  return { message };
};

export const resetPasswordFromToken = async (req: IRequest, email: string, value: string, password: string) => {
  const errMsg = 'Token not found. Please request password reset again.';
  const user = await UserModel.findOne({ 'emails.email': email });
  if (!user) {
    throw new CustomError(errMsg, ErrorTypes.AUTHENTICATION);
  }
  const token = await TokenService.getTokenAndConsume(user, value, TokenTypes.Password);
  if (!token) {
    throw new CustomError(errMsg, ErrorTypes.AUTHENTICATION);
  }
  const _user = await changePassword(req, user, password);
  return _user;
};
