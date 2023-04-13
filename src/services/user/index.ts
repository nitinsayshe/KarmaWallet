import argon2 from 'argon2';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import isemail from 'isemail';
import { FilterQuery, Types } from 'mongoose';
import { nanoid } from 'nanoid';
import { PlaidClient } from '../../clients/plaid';
import { deleteContact } from '../../integrations/activecampaign';
import { CardStatus, ErrorTypes, passwordResetTokenMinutes, TokenTypes, UserRoles } from '../../lib/constants';
import { ALPHANUMERIC_REGEX } from '../../lib/constants/regex';
import CustomError, { asCustomError } from '../../lib/customError';
import { getUtcDate } from '../../lib/date';
import { verifyRequiredFields } from '../../lib/requestData';
import { isValidEmailFormat } from '../../lib/string';
import { CardModel } from '../../models/card';
import { CommissionModel } from '../../models/commissions';
import { ILegacyUserDocument, LegacyUserModel } from '../../models/legacyUser';
import { TokenModel } from '../../models/token';
import { TransactionModel } from '../../models/transaction';
import { IUser, IUserDocument, IUserIntegrations, UserEmailStatus, UserModel } from '../../models/user';
import { UserGroupModel } from '../../models/userGroup';
import { UserImpactTotalModel } from '../../models/userImpactTotals';
import { UserLogModel } from '../../models/userLog';
import { UserMontlyImpactReportModel } from '../../models/userMonthlyImpactReport';
import { UserTransactionTotalModel } from '../../models/userTransactionTotals';
import { VisitorModel } from '../../models/visitor';
import { IPromo, IPromoTypes, PromoModel } from '../../models/promo';
import { UserGroupStatus } from '../../types/groups';
import { IRequest } from '../../types/request';
import { sendPasswordResetEmail } from '../email';
import * as Session from '../session';
import { cancelUserSubscriptions, updateNewUserSubscriptions, updateSubscriptionsOnEmailChange } from '../subscription';
import * as TokenService from '../token';
import { validatePassword } from './utils/validate';
import { resendEmailVerification } from './verification';
import { IAddKarmaCommissionToUserRequestParams, addCashbackToUser } from '../commission';

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
  zipcode?: string;
  role?: UserRoles;
  promo?: string;
  pw?: string;
  shareASaleId?: boolean;
  referralParams?: IUrlParam[];
}

export interface IRegisterUserData {
  name: string;
  token: string;
  password: string;
  promo?: string;
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

export const handleCreateAccountPromo = async (userId: string, promo: IPromo) => {
  console.log('//////// this is the promo', userId, promo);
  if (promo.type === IPromoTypes.CASHBACK) {
    console.log('/////// there is a cashback promo');
    try {
      const { APP_USER_ID } = process.env;
      if (!APP_USER_ID) throw new CustomError('AppUserId not found', ErrorTypes.SERVICE);
      const appUser = await UserModel.findOne({ _id: APP_USER_ID });
      if (!appUser) throw new CustomError('AppUser not found', ErrorTypes.SERVICE);
      const mockRequest = ({
        requestor: appUser,
        authKey: '',
        params: { userId, promo },
      } as unknown as IRequest<IAddKarmaCommissionToUserRequestParams, {}, {}>);
      await addCashbackToUser(mockRequest);
    } catch (error) {
      console.log('/////// cashback promo failed');
      throw asCustomError(error);
    }
  }
};

export const storeNewLogin = async (userId: string, loginDate: Date) => {
  await UserLogModel.findOneAndUpdate({ userId, date: loginDate }, { date: loginDate }, { upsert: true }).sort({
    date: -1,
  });
};

export const register = async (req: IRequest, {
  password,
  name,
  token,
  promo,
}: IRegisterUserData) => {
  let promoData;
  // check that all required fields are present
  if (!password) throw new CustomError('A password is required.', ErrorTypes.INVALID_ARG);
  if (!name) throw new CustomError('A name is required.', ErrorTypes.INVALID_ARG);
  if (!token) throw new CustomError('A token is required.', ErrorTypes.INVALID_ARG);
  // find token for account creationn and find associated visitor
  const tokenInfo = await TokenModel.findOne({ value: token });
  if (!tokenInfo) throw new CustomError('No valid token was found for this email.', ErrorTypes.INVALID_ARG);
  const visitor = await VisitorModel.findOne({ _id: tokenInfo.visitor });

  // check password is valid
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) { throw new CustomError(`Invalid password. ${passwordValidation.message}`, ErrorTypes.INVALID_ARG); }
  const hash = await argon2.hash(password);

  // check that email is valid (should have already checked when visitor was created, but just in case)
  const email = visitor.email?.toLowerCase()?.trim();
  if (!email || !isemail.validate(email)) throw new CustomError('a valid email is required.', ErrorTypes.INVALID_ARG);

  // confirm email does not already belong to another user
  const emailExists: IUserDocument = await UserModel.findOne({ 'emails.email': email });
  if (!!emailExists) throw new CustomError('Email already in use.', ErrorTypes.CONFLICT);

  // start building the user information
  const { urlParams, shareASale, groupCode } = visitor.integrations;
  const emails = [{ email, verified: true, primary: true }];
  name = name.replace(/\s/g, ' ').trim();
  const integrations: IUserIntegrations = {};

  const newUserData: any = {
    name,
    email,
    emails,
    password: hash,
    role: UserRoles.None,
  };

  // if user is from shareASale, generate a unique tracking id to add to the user object
  if (!!shareASale) {
    let uniqueId = nanoid();
    let existingId = await UserModel.findOne({ 'integrations.shareasale.trackingId': uniqueId });

    while (existingId) {
      uniqueId = nanoid();
      existingId = await UserModel.findOne({ 'integrations.shareasale.trackingId': uniqueId });
    }

    integrations.shareasale = {
      trackingId: uniqueId,
    };
  }

  // save any params that the user came to our site
  if (!!urlParams && urlParams.length > 0) {
    const validParams: IUrlParam[] = urlParams.filter(
      (param) => !!ALPHANUMERIC_REGEX.test(param.key) && !!ALPHANUMERIC_REGEX.test(param.value),
    );
    if (validParams.length > 0) integrations.referrals = { params: validParams };
  }

  if (promo) {
    const promoItem = await PromoModel.findOne({ _id: promo });
    promoData = promoItem;
    integrations.promos = [...(integrations.promos || []), promoItem];
  }

  newUserData.integrations = integrations;
  const newUser = await UserModel.create(newUserData);
  if (!newUser) throw new CustomError('Error creating user', ErrorTypes.SERVER);

  try {
    let authKey = '';
    authKey = await Session.createSession(newUser._id.toString());
    await storeNewLogin(newUser?._id.toString(), getUtcDate().toDate());
    await updateNewUserSubscriptions(newUser);
    const responseInfo: any = {
      user: newUser,
      authKey,
    };
    // return the groupCode to the front end so they can join the user to the group upon successful registration
    if (!!groupCode) responseInfo.groupCode = groupCode;
    if (!!promoData) handleCreateAccountPromo(newUser._id.toString(), promoData);
    return responseInfo;
  } catch (afterCreationError) {
    // undo user creation
    await UserModel.deleteOne({ _id: newUser?._id });
    throw new CustomError('Error creating user', ErrorTypes.SERVER);
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
    const user = await UserModel.findOne(query);

    if (!user) throw new CustomError('User not found', ErrorTypes.NOT_FOUND);

    return user;
  } catch (err) {
    throw asCustomError(err);
  }
};

export const getUserById = async (_: IRequest, uid: string) => {
  try {
    const user = await UserModel.findById({ _id: uid });

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
    return await UserModel.findByIdAndUpdate(
      user._id,
      { ...updates, lastModified: dayjs().utc().toDate() },
      { new: true },
    );
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

  const existingEmail = user.emails.find((userEmail) => userEmail.email === email);
  const prevEmail = user.emails.find((e) => e.primary)?.email;

  if (!existingEmail) {
    // check if another user has this email
    const isEmailInUse = await UserModel.findOne({ 'emails.email': email });
    if (isEmailInUse) throw new CustomError('Email already in use.', ErrorTypes.INVALID_ARG);
    user.emails = user.emails.map((userEmail) => ({
      email: userEmail.email,
      status: userEmail.status,
      primary: false,
    }));
    user.emails.push({ email, status: UserEmailStatus.Unverified, primary: true });
    // TODO: remove when legacy user is removed
    if (legacyUser) legacyUser.emails = user.emails;
    // updating requestor for access to new email
    resendEmailVerification({ ...req, requestor: user });
  } else {
    user.emails = user.emails.map((userEmail) => ({
      email: userEmail.email,
      status: userEmail.status,
      primary: email === userEmail.email,
    }));
    if (legacyUser) legacyUser.emails = user.emails;
  }

  await updateSubscriptionsOnEmailChange(user._id, user.name, prevEmail, email);
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

export const resetPasswordFromToken = async (req: IRequest<{}, {}, ILoginData & IUpdatePasswordBody>) => {
  const { newPassword, token } = req.body;
  const requiredFields = ['newPassword', 'token'];
  const { isValid, missingFields } = verifyRequiredFields(requiredFields, req.body);
  if (!isValid) {
    throw new CustomError(
      `Invalid input. Body requires the following fields: ${missingFields.join(', ')}.`,
      ErrorTypes.INVALID_ARG,
    );
  }
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

export const deleteUser = async (req: IRequest<{}, { userId: string }, {}>) => {
  try {
    // validate user id
    const { userId } = req.query;
    if (!userId || !Types.ObjectId.isValid(userId)) throw new CustomError('Invalid user id', ErrorTypes.INVALID_ARG);

    // get user from db
    const user = await UserModel.findById(userId).lean();
    if (!user) throw new CustomError('Invalid user id', ErrorTypes.INVALID_ARG);

    // get user email
    const email = user.emails.find((userEmail) => userEmail.primary)?.email;

    // throw error if user has commissions
    const commissions = await CommissionModel.countDocuments({ user: user._id });
    if (commissions > 0) {
      throw new CustomError('Cannot delete users with commissions.', ErrorTypes.INVALID_ARG);
    }

    // throw error if user is enrolled in group
    const userGroups = await UserGroupModel.countDocuments({
      user: user._id,
      status: { $nin: [UserGroupStatus.Removed, UserGroupStatus.Banned, UserGroupStatus.Left] },
    });
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
