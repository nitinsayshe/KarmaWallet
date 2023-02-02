import argon2 from 'argon2';
import isemail from 'isemail';
import { nanoid } from 'nanoid';
import { FilterQuery, Types } from 'mongoose';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import {
  IUser, IUserDocument, IUserIntegrations, UserEmailStatus, UserModel,
} from '../../models/user';
import CustomError, { asCustomError } from '../../lib/customError';
import * as Session from '../session';
import {
  TokenTypes, passwordResetTokenMinutes, ErrorTypes, UserRoles, CardStatus,
} from '../../lib/constants';
import * as TokenService from '../token';
import { IRequest } from '../../types/request';
import { isValidEmailFormat } from '../../lib/string';
import { validatePassword } from './utils/validate';
import { ILegacyUserDocument, LegacyUserModel } from '../../models/legacyUser';
import { ALPHANUMERIC_REGEX, ZIPCODE_REGEX } from '../../lib/constants/regex';
import { resendEmailVerification } from './verification';
import { verifyRequiredFields } from '../../lib/requestData';
import { sendPasswordResetEmail } from '../email';
import { UserLogModel } from '../../models/userLog';
import { getUtcDate } from '../../lib/date';
import { cancelUserSubscriptions, updateNewUserSubscriptions, updateSubscriptionsIfUserWasVisitor } from '../subscription';
import { PlaidClient } from '../../clients/plaid';
import { CardModel } from '../../models/card';
import { TransactionModel } from '../../models/transaction';
import { UserGroupModel } from '../../models/userGroup';
import { UserImpactTotalModel } from '../../models/userImpactTotals';
import { UserMontlyImpactReportModel } from '../../models/userMonthlyImpactReport';
import { UserTransactionTotalModel } from '../../models/userTransactionTotals';
import { deleteContact } from '../../integrations/activecampaign';
import { UserGroupStatus } from '../../types/groups';

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

export interface IUrlParam {
  key: string;
  value: string;
}

export interface IUserData extends ILoginData {
  name: string;
  zipcode: string;
  role?: UserRoles;
  pw?: string;
  shareASaleId?: boolean;
  referralParams?: IUrlParam[];
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

export const storeNewLogin = async (userId: string, loginDate: Date) => {
  await UserLogModel.findOneAndUpdate(
    { userId, date: loginDate },
    { date: loginDate },
    { upsert: true },
  ).sort({ date: -1 });
};

export const register = async (req: IRequest, {
  password,
  email,
  name,
  zipcode,
  shareASaleId,
  referralParams,
}: IUserData) => {
  try {
    if (!password) throw new CustomError('A password is required.', ErrorTypes.INVALID_ARG);
    if (!name) throw new CustomError('A name is required.', ErrorTypes.INVALID_ARG);
    name = name.replace(/\s/g, ' ').trim();

    email = email?.toLowerCase()?.trim();
    if (!email || !isemail.validate(email)) throw new CustomError('a valid email is required.', ErrorTypes.INVALID_ARG);

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
    const integrations: IUserIntegrations = {};

    // TODO: delete creating a new legacy user when able.
    const legacyUser = new LegacyUserModel({
      _id: nanoid(),
      name,
      email,
      emails,
      password: hash,
      zipcode,
      role: UserRoles.None,
    });

    await legacyUser.save();

    // map new legacy user to new user
    const rawUser = {
      ...legacyUser.toObject(),
      emails,
      legacyId: legacyUser._id,
      integrations,
    };

    if (!!shareASaleId) {
      let uniqueId = nanoid();
      let existingId = await UserModel.findOne({ 'integrations.shareasale.trackingId': uniqueId });

      while (existingId) {
        uniqueId = nanoid();
        existingId = await UserModel.findOne({ 'integrations.shareasale.trackingId': uniqueId });
      }

      rawUser.integrations.shareasale = {
        trackingId: uniqueId,
      };
    }

    if (!!referralParams) {
      const validParams = referralParams.filter((param) => !!ALPHANUMERIC_REGEX.test(param.key) && !!ALPHANUMERIC_REGEX.test(param.value));
      if (validParams.length > 0) rawUser.integrations.referrals = { params: referralParams };
    }

    delete rawUser._id;
    const newUser = new UserModel({ ...rawUser });
    await newUser.save();

    const authKey = await Session.createSession(newUser._id.toString());

    await storeNewLogin(newUser._id.toString(), getUtcDate().toDate());
    await updateNewUserSubscriptions(newUser);

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

  await storeNewLogin(user._id.toString(), getUtcDate().toDate());

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
  role,
  legacyId,
  integrations,
}: IUserDocument) => {
  const _integrations: Partial<IUserIntegrations> = {};
  if (integrations?.paypal) _integrations.paypal = integrations.paypal;
  if (integrations?.shareasale) _integrations.shareasale = integrations.shareasale;
  return {
    _id,
    email,
    emails,
    name,
    dateJoined,
    zipcode,
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
    if (!!updates?.emails) {
      updates.emails.forEach((email) => {
        if (!isemail.validate(email.email)) throw new CustomError('Invalid email found.', ErrorTypes.INVALID_ARG);
      });
    }
    const email = updates.email?.toLowerCase()?.trim();
    if (!!email && !isemail.validate(email)) throw new CustomError('Invalid email provided', ErrorTypes.INVALID_ARG);
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
    if (legacyUser) legacyUser.emails = user.emails;
    // updating requestor for access to new email
    resendEmailVerification({ ...req, requestor: user });
    // If this is an existing email, this update should have already happened
    await updateSubscriptionsIfUserWasVisitor(email, user._id.toString());
  } else {
    user.emails = user.emails.map(userEmail => ({ email: userEmail.email, status: userEmail.status, primary: email === userEmail.email }));
    if (legacyUser) legacyUser.emails = user.emails;
  }
};

export const updateProfile = async (req: IRequest<{}, {}, IUserData>) => {
  const { requestor } = req;
  const updates = req.body;
  const legacyUser = await LegacyUserModel.findOne({ _id: requestor.legacyId });
  if (!!updates?.email) {
    updates.email = updates.email.toLowerCase()?.trim();
    if (!isemail.validate(updates.email)) throw new CustomError('Invalid email provided', ErrorTypes.INVALID_ARG);
    await updateUserEmail({ user: requestor, legacyUser, email: updates.email, req, pw: updates?.pw });
  }
  const allowedFields: UserKeys[] = ['name', 'zipcode'];
  // TODO: find solution to allow dynamic setting of fields
  for (const key of allowedFields) {
    if (typeof updates?.[key] === 'undefined') continue;
    const name = updates?.name?.replace(/\s/g, ' ');
    switch (key) {
      case 'name':
        requestor.name = name;
        if (legacyUser) legacyUser.name = name;
        break;
      case 'zipcode':
        requestor.zipcode = updates.zipcode;
        if (legacyUser) legacyUser.zipcode = updates.zipcode;
        break;
      default:
        break;
    }
  }

  if (legacyUser) await legacyUser.save();
  await requestor.save();
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

export const deleteLinkedCardData = async (userId: Types.ObjectId) => {
  const plaidClient = new PlaidClient();

  const cards = await CardModel.find({ userId, status: CardStatus.Linked });

  // Unlinking Plaid Access Tokens
  for (const card of cards) {
    await plaidClient.invalidateAccessToken({ access_token: card.integrations.plaid.accessToken });
  }

  await CardModel.deleteMany({ userId });
};

export const deleteUserData = async (userId: Types.ObjectId) => {
  // Removing Transacitons
  await TransactionModel.findOne({ user: userId });
  await deleteLinkedCardData(userId);
  // Removing Other Data/Reports
  await UserImpactTotalModel.deleteOne({ user: userId });
  await UserLogModel.deleteMany({ userId });
  await UserMontlyImpactReportModel.deleteMany({ user: userId });
  await UserTransactionTotalModel.deleteMany({ user: userId });
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

export const deleteUser = async (req: IRequest<{}, {userId: string}, {}>) => {
  try {
    // validate user id
    const { userId } = req.query;
    if (!userId || !Types.ObjectId.isValid(userId)) throw new CustomError('Invalid user id', ErrorTypes.INVALID_ARG);

    // get user from db
    const user = await UserModel.findById(userId).lean();
    if (!user) throw new CustomError('Invalid user id', ErrorTypes.INVALID_ARG);

    // get user email
    const email = user.emails.find(userEmail => userEmail.primary)?.email;

    // throw error if user is enrolled in group
    const userGroups = await UserGroupModel.countDocuments({ user: user._id, status: { $nin: [UserGroupStatus.Removed, UserGroupStatus.Banned, UserGroupStatus.Left] } });
    if (userGroups > 0) {
      throw new CustomError('Cannot delete users enrolled in group(s).', ErrorTypes.INVALID_ARG);
    }

    // delete user from active campaign
    if (email) await deleteContact(email);
    await cancelUserSubscriptions(user._id.toString());

    await deleteUserData(user._id);

    await UserModel.deleteOne({ _id: user._id });
  } catch (err) {
    throw asCustomError(err);
  }
  return { message: 'OK' };
};
