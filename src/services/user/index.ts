import argon2 from 'argon2';
import { nanoid } from 'nanoid';
import { FilterQuery } from 'mongoose';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import {
  IUser, IUserDocument, IUserIntegrations, UserEmailStatus, UserModel,
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
import { ILegacyUserDocument, LegacyUserModel } from '../../models/legacyUser';
import { ZIPCODE_REGEX } from '../../lib/constants/regex';
import { resendEmailVerification } from './verification';
import { verifyRequiredFields } from '../../lib/requestData';
import { sendPasswordResetEmail } from '../email';

dayjs.extend(utc);

export interface IVerifyTokenBody {
  token: string;
}

export interface ILoginData {
  email: string;
  password?: string;
  token?: string;
}

export interface IUpdatePasswordBody {
  newPassword: string;
  password: string;
}

export interface IUserData extends ILoginData {
  name: string;
  zipcode: string;
  subscribedUpdates: boolean;
  role?: UserRoles;
  pw?: string;
}

export interface IEmailVerificationData {
  email: string;
  code: string;
  tokenValue: string;
}

export interface IUpdateUserEmailParams {
  user: IUserDocument;
  email: string;
  legacyUser: ILegacyUserDocument;
  req: IRequest;
  pw: string;
}

type UserKeys = keyof IUserData;

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
    email = email?.toLowerCase();
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

    const emails = [{ email, verified: false, primary: true }];

    // TODO: delete creating a new legacy user when able.
    const legacyUser = new LegacyUserModel({
      _id: nanoid(),
      name,
      email,
      emails,
      password: hash,
      subscribedUpdates,
      zipcode,
      role: UserRoles.None,
    });

    await legacyUser.save();

    // map new legacy user to new user
    const rawUser = {
      ...legacyUser.toObject(),
      emails,
      legacyId: legacyUser._id,
    };

    delete rawUser._id;
    const newUser = new UserModel({ ...rawUser });
    await newUser.save();

    const authKey = await Session.createSession(newUser._id.toString());

    const verificationEmailRequest = { ...req, requestor: newUser, body: { email } };
    await resendEmailVerification(verificationEmailRequest);

    return { user: newUser, authKey };
  } catch (err) {
    throw asCustomError(err);
  }
};

export const login = async (_: IRequest, { email, password }: ILoginData) => {
  email = email?.toLowerCase();
  const user = await UserModel.findOne({ emails: { $elemMatch: { email, primary: true } } });
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

export const getUsersPaginated = (_: IRequest, query: FilterQuery<IUser>) => {
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

export const getUsers = async (_: IRequest, query = {}) => UserModel.find(query);

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
  integrations,
}: IUserDocument) => {
  const _integrations: Partial<IUserIntegrations> = {};
  if (integrations?.paypal) _integrations.paypal = integrations.paypal;
  return {
    _id,
    email,
    emails,
    name,
    dateJoined,
    zipcode,
    subscribedUpdates,
    role,
    legacyId,
    integrations: _integrations,
  };
};

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

// used internally in multiple services to update a user's password
const changePassword = async (req: IRequest, user: IUserDocument, newPassword: string) => {
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.valid) {
    throw new CustomError(`Invalid new password. ${passwordValidation.message}`, ErrorTypes.INVALID_ARG);
  }
  const hash = await argon2.hash(newPassword);
  const updatedUser = await updateUser(req, user, { password: hash });
  // TODO: email user to notify them that their password has been changed.
  // TODO: remove when legacy users are removed
  await LegacyUserModel.findOneAndUpdate({ _id: user.legacyId }, { password: hash });
  return updatedUser;
};

export const updateUserEmail = async ({ user, legacyUser, email, req, pw }: IUpdateUserEmailParams) => {
  email = email?.toLowerCase();
  if (!pw) throw new CustomError('Your password is required when updating your email.', ErrorTypes.INVALID_ARG);
  const passwordMatch = await argon2.verify(req.requestor.password, pw);
  if (!passwordMatch) throw new CustomError('Invalid password', ErrorTypes.INVALID_ARG);
  if (!email) throw new CustomError('A new email address is required.', ErrorTypes.INVALID_ARG);
  if (!isValidEmailFormat(email)) throw new CustomError('Invalid email format.', ErrorTypes.INVALID_ARG);

  const existingEmail = user.emails.find(userEmail => userEmail.email === email);

  if (!existingEmail) {
    // check if another user has this email
    const isEmailInUse = await UserModel.findOne({ 'emails.email': email });
    if (isEmailInUse) throw new CustomError('Email already in use.', ErrorTypes.INVALID_ARG);
    user.emails = user.emails.map(userEmail => ({ email: userEmail.email, status: userEmail.status, primary: false }));
    user.emails.push({ email, status: UserEmailStatus.Unverified, primary: true });
    // TODO: remove when legacy user is removed
    legacyUser.emails = user.emails;
    // updating requestor for access to new email
    resendEmailVerification({ ...req, requestor: user });
  } else {
    user.emails = user.emails.map(userEmail => ({ email: userEmail.email, status: userEmail.status, primary: email === userEmail.email }));
    legacyUser.emails = user.emails;
  }
};

export const updateProfile = async (req: IRequest<{}, {}, IUserData>) => {
  const { requestor } = req;
  const updates = req.body;
  const legacyUser = await LegacyUserModel.findOne({ _id: requestor.legacyId });
  if (updates?.email) {
    updates.email = updates?.email?.toLowerCase();
    await updateUserEmail({ user: requestor, legacyUser, email: updates.email, req, pw: updates?.pw });
  }
  const allowedFields: UserKeys[] = ['name', 'zipcode', 'subscribedUpdates'];
  // TODO: find solution to allow dynamic setting of fields
  for (const key of allowedFields) {
    if (typeof updates?.[key] === 'undefined') continue;
    switch (key) {
      case 'name':
        requestor.name = updates.name;
        legacyUser.name = updates.name;
        break;
      case 'zipcode':
        requestor.zipcode = updates.zipcode;
        legacyUser.zipcode = updates.zipcode;
        break;
      case 'subscribedUpdates':
        requestor.subscribedUpdates = updates.subscribedUpdates;
        legacyUser.subscribedUpdates = updates.subscribedUpdates;
        break;
      default:
        break;
    }
  }

  await Promise.all([
    requestor.save(),
    legacyUser.save(),
  ]);

  return requestor;
};

// used as endpoint for UI to update password
export const updatePassword = async (req: IRequest<{}, {}, IUpdatePasswordBody>) => {
  const { newPassword, password } = req.body;
  if (!newPassword || !password) throw new CustomError('New and current passwords required.', ErrorTypes.INVALID_ARG);
  const passwordMatch = await argon2.verify(req.requestor.password, password);
  if (!passwordMatch) throw new CustomError('Invalid password', ErrorTypes.INVALID_ARG);
  return changePassword(req, req.requestor._id, newPassword);
};

export const createPasswordResetToken = async (req: IRequest<{}, {}, ILoginData>) => {
  const minutes = passwordResetTokenMinutes;
  let { email } = req.body;
  email = email?.toLowerCase();
  if (!email || !isValidEmailFormat(email)) throw new CustomError('Invalid email.', ErrorTypes.INVALID_ARG);
  const user = await UserModel.findOne({ 'emails.email': email });
  if (user) {
    const token = await TokenService.createToken({ user, resource: { email }, minutes, type: TokenTypes.Password });
    await sendPasswordResetEmail({ user: user._id, recipientEmail: email, name: user.name, token: token.value });
  }
  const message = `An email has been sent to the email address you provided with further instructions. Your reset request will expire in ${passwordResetTokenMinutes} minutes.`;
  return { message };
};

export const resetPasswordFromToken = async (req: IRequest<{}, {}, (ILoginData & IUpdatePasswordBody)>) => {
  const { newPassword, token } = req.body;
  const requiredFields = ['newPassword', 'token'];
  const { isValid, missingFields } = verifyRequiredFields(requiredFields, req.body);
  if (!isValid) throw new CustomError(`Invalid input. Body requires the following fields: ${missingFields.join(', ')}.`, ErrorTypes.INVALID_ARG);
  const errMsg = 'Token not found. Please request password reset again.';
  const existingToken = await TokenService.getTokenAndConsume({ value: token, type: TokenTypes.Password });
  if (!existingToken) throw new CustomError(errMsg, ErrorTypes.NOT_FOUND);
  const email = existingToken?.resource?.email;
  if (!email) throw new CustomError(errMsg, ErrorTypes.NOT_FOUND);
  const user = await UserModel.findOne({ 'emails.email': email });
  if (!user) throw new CustomError(errMsg, ErrorTypes.NOT_FOUND);
  return changePassword(req, user, newPassword);
};

export const verifyPasswordResetToken = async (req: IRequest<{}, {}, IVerifyTokenBody>) => {
  const { token } = req.body;
  if (!token) throw new CustomError('Token required.', ErrorTypes.INVALID_ARG);
  const _token = await TokenService.getToken({
    value: token,
    type: TokenTypes.Password,
    consumed: false,
  });
  if (!_token) throw new CustomError('Token not found.', ErrorTypes.NOT_FOUND);
  return { message: 'OK' };
};
