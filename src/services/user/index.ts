import * as argon2 from 'argon2';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import isemail from 'isemail';
import { FilterQuery, Types } from 'mongoose';
import { PlaidClient } from '../../clients/plaid';
import { deleteContact, updateContactEmail, syncUserAddressFields } from '../../integrations/activecampaign';
import { deleteKardUsersForUser } from '../../integrations/kard';
import { CardStatus, ErrorTypes, passwordResetTokenMinutes, TokenTypes, UserRoles } from '../../lib/constants';
import CustomError, { asCustomError } from '../../lib/customError';
import { getUtcDate } from '../../lib/date';
import { isValidEmailFormat } from '../../lib/string';
import { filterToValidQueryParams } from '../../lib/validation';
import { CardModel } from '../../models/card';
import { CommissionModel } from '../../models/commissions';
import { LegacyUserModel } from '../../models/legacyUser';
import { IPromo, IPromoEvents, IPromoTypes, PromoModel } from '../../models/promo';
import { TokenModel } from '../../models/token';
import { TransactionModel } from '../../models/transaction';
import { IUserDocument, UserModel } from '../../models/user';
import { UserGroupModel } from '../../models/userGroup';
import { UserImpactTotalModel } from '../../models/userImpactTotals';
import { UserLogModel } from '../../models/userLog';
import { UserMontlyImpactReportModel } from '../../models/userMonthlyImpactReport';
import { UserTransactionTotalModel } from '../../models/userTransactionTotals';
import { IVisitorDocument, VisitorModel } from '../../models/visitor';
import { UserGroupStatus } from '../../types/groups';
import { IRequest } from '../../types/request';
import { addCashbackToUser, IAddKarmaCommissionToUserRequestParams } from '../commission';
import { sendChangeEmailRequestAffirmationEmail, sendChangeEmailRequestConfirmationEmail, sendChangePasswordEmail, sendDeleteAccountRequestEmail, sendPasswordResetEmail } from '../email';
import * as Session from '../session';
import { cancelAllUserSubscriptions, updateNewUserSubscriptions } from '../marketingSubscription';
import * as TokenService from '../token';
import {
  IRegisterUserData,
  ILoginData,
  IUpdateUserEmailParams,
  IUserData,
  IUpdatePasswordBody,
  IVerifyTokenBody,
  UserKeys,
  IDeleteAccountRequest,
  IUrlParam,
} from './types';
import { validatePassword } from './utils/validate';
import { IEmail, resendEmailVerification, verifyBiometric } from './verification';
import { DeleteAccountRequestModel } from '../../models/deleteAccountRequest';
import { removeFromGroup } from '../groups';
import { IUserIntegrations, UserEmailStatus, IDeviceInfo, IUser } from '../../models/user/types';
import { getStateFromZipcode } from '../utilities';
import { ChangeEmailRequestModel } from '../../models/changeEmailRequest';
import * as UserServiceTypes from './types';
import { MarqetaReasonCodeEnum } from '../../clients/marqeta/types';
import { IChangeEmailProcessStatus, IChangeEmailVerificationStatus } from '../../models/changeEmailRequest/types';
import { checkIfUserWithEmailExists, createShareasaleTrackingId, storeNewLogin } from './utils';
import { passedInternalKyc } from '../../integrations/persona';
import { updateMarqetaUser, updateMarqetaUserStatus } from '../../integrations/marqeta/user';
import { IMarqetaUserStatus } from '../../integrations/marqeta/user/types';
import { closeKarmaCard } from '../karmaCard/utils';

dayjs.extend(utc);

export const handleCreateAccountPromo = async (userId: string, promo: IPromo) => {
  if (promo.type === IPromoTypes.CASHBACK && !promo.events.includes(IPromoEvents.LINK_CARD)) {
    const existingCommissionsForPromo = await CommissionModel.find({ user: userId, promoId: promo._id });
    const promoEntries = promo.limit;
    if (existingCommissionsForPromo.length >= promoEntries) return;

    try {
      const { APP_USER_ID } = process.env;
      if (!APP_USER_ID) throw new CustomError('AppUserId not found', ErrorTypes.SERVICE);
      const appUser = await UserModel.findOne({ _id: APP_USER_ID });
      if (!appUser) throw new CustomError('AppUser not found', ErrorTypes.SERVICE);
      const mockRequest = {
        requestor: appUser,
        authKey: '',
        params: { userId, promo },
      } as unknown as IRequest<IAddKarmaCommissionToUserRequestParams, {}, {}>;
      await addCashbackToUser(mockRequest);
    } catch (error) {
      throw asCustomError(error);
    }
  }
};

// Send an email to the user with a link to change their password after account/password were created internally
export const initiateChangePasswordEmail = async (user: IUserDocument, email: string) => {
  const days = 10;
  email = email?.toLowerCase();
  const token = await TokenService.createToken({ user, days, type: TokenTypes.Password, resource: { email } });
  await sendChangePasswordEmail({ user: user._id, token: token.value, name: user.name, recipientEmail: email });
  return `Verfication instructions have been sent to your provided email address. This token will expire in ${days} days.`;
};

// Set isAutoGenerated to true if the user is being created internally (i.e. admin or in backend bypassing the email step)
export const register = async ({ password, name, token, promo, zipcode, visitorId, isAutoGenerated = false }: IRegisterUserData) => {
  // !isAutoGenerated is regular signup path thru frontend, params will have a token from an email link
  // isAutoGenerated if user is created internally (i.e. admin or in backend bypassing the email step), they will have a visitorId instead of a token
  let promoData;
  // setting to visitorId if it is passed in
  let _visitorId = visitorId;

  // Check that all required fields are presentf
  if (!password) throw new CustomError('A password is required.', ErrorTypes.INVALID_ARG);
  if (!name) throw new CustomError('A name is required.', ErrorTypes.INVALID_ARG);
  if (!visitorId && isAutoGenerated) throw new CustomError('A visitor_id is required.', ErrorTypes.INVALID_ARG);
  if (!token && !isAutoGenerated) throw new CustomError('A visitor_id is required.', ErrorTypes.INVALID_ARG);

  // Check password is valid and convert to a hash
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    throw new CustomError(`Invalid password. ${passwordValidation.message}`, ErrorTypes.INVALID_ARG);
  }
  const hash = await argon2.hash(password);

  // Find the visitorId associated with the token that was pass in
  if (!!token) {
    const tokenInfo = await TokenModel.findOne({ value: token }).lean();
    if (!tokenInfo) throw new CustomError('No valid token was found for this email.', ErrorTypes.INVALID_ARG);
    _visitorId = tokenInfo.visitor.toString();
  }

  // Grab the email from the visitor objec and check that the email is valid
  // (should have already checked when visitor was created, but just in case)
  // and confirm email does not already belong to another user
  const visitor = await VisitorModel.findOne({ _id: _visitorId });
  const email = visitor.email?.toLowerCase()?.trim();
  if (!email || !isemail.validate(email)) throw new CustomError('a valid email is required.', ErrorTypes.INVALID_ARG);
  const emailAlreadyInUse = await checkIfUserWithEmailExists(email);

  if (!!emailAlreadyInUse) throw new CustomError('Email already in use.', ErrorTypes.CONFLICT);

  // Start building the user information, grabs the integrations information from the visitor object
  const integrations: IUserIntegrations = {};
  const { urlParams, groupCode, marqeta, persona } = visitor.integrations;
  const { sscid, sscidCreatedOn, xTypeParam } = visitor.integrations.shareASale;
  const emails = [{ email, status: !!token ? UserEmailStatus.Verified : UserEmailStatus.Unverified, primary: true }];
  name = name.replace(/\s/g, ' ').trim();

  const newUserData: any = {
    name,
    email,
    emails,
    password: hash,
    role: UserRoles.None,
    // once user updates their password after clicking on a link from an email, set this to false and update their email status to verified
    isAutoGeneratedPassword: !!isAutoGenerated,
    zipcode,
  };

  // If user is from shareASale, generate a unique tracking id to add to the user object
  if (!!sscid) {
    integrations.shareasale = {
      sscid,
      sscidCreatedOn,
      xTypeParam,
    };

    if (isAutoGenerated) {
      const trackingId = await createShareasaleTrackingId();
      integrations.shareasale.trackingId = trackingId;
    }
  }

  // Save any params from the visitor object that are valid to the user object (this check should have already been performed when the visitor was created too)
  const _validUrlParams = filterToValidQueryParams(urlParams);
  if (!!_validUrlParams.length) integrations.referrals = { params: _validUrlParams };

  // Promos will have been saved on visitor object as well, save this info to the user
  if (promo) {
    const promoItem = await PromoModel.findOne({ _id: promo });
    promoData = promoItem;
    integrations.promos = [...(integrations.promos || []), promoItem];
  }

  // if marqeta is present in visitor
  integrations.marqeta = marqeta;
  if (!!persona) integrations.persona = persona;
  newUserData.integrations = integrations;
  const newUser = await UserModel.create(newUserData);
  if (!newUser) throw new CustomError('Error creating user', ErrorTypes.SERVER);

  try {
    let authKey = '';
    authKey = await Session.createSession(newUser._id.toString());
    await storeNewLogin(newUser?._id.toString(), getUtcDate().toDate(), authKey);

    const responseInfo: any = {
      user: newUser,
      authKey,
    };

    // Auto created account for Karma Card applicant
    if (!!isAutoGenerated) {
      await initiateChangePasswordEmail(newUser, email);
    } else {
      await updateNewUserSubscriptions(newUser);
    }
    if (!!promoData) handleCreateAccountPromo(newUser._id.toString(), promoData);
    if (!!groupCode) responseInfo.groupCode = groupCode;

    return responseInfo;
  } catch (afterCreationError) {
    // undo user creation
    await UserModel.deleteOne({ _id: newUser?._id });
    await UserGroupModel.deleteOne({ user: newUser?._id });
    throw new CustomError('Error creating user', ErrorTypes.SERVER);
  }
};

export const addFCMAndDeviceInfo = async (user: IUserDocument, fcmToken: string, deviceInfo: IDeviceInfo) => {
  // Add FCM token and device info of the user
  try {
    const { deviceId } = deviceInfo;
    if (fcmToken && deviceId) {
      // Check if the same FCM token is mapped with different user, if it is, make the token of that user NULL
      const userWithSameToken = await UserModel.findOne({ 'integrations.fcm.token': fcmToken });
      if (userWithSameToken && userWithSameToken?._id.toString() !== user?._id.toString()) {
        userWithSameToken.integrations.fcm.forEach((item) => {
          if (item.token === fcmToken) {
            item.token = null;
          }
        });
        await userWithSameToken.save();
      }
      // Store the FCM token in current user's repo
      const { fcm } = user.integrations;
      const existingDeviceIndex = fcm.findIndex((item) => item.deviceId === deviceId);

      if (existingDeviceIndex !== -1) {
        // Device already exists, update the token
        user.integrations.fcm[existingDeviceIndex].token = fcmToken;
      } else {
        // Device doesn't exist, add a new entry
        user.integrations.fcm.push({ token: fcmToken, deviceId });
        user.deviceInfo.push(deviceInfo);
      }
      await user.save();
    }
  } catch (error) {
    console.log('Error in storing FCM token', error);
  }
};

export const login = async (req: IRequest, { email, password, biometricSignature, fcmToken, deviceInfo }: ILoginData) => {
  email = email?.toLowerCase();
  const user = await UserModel.findOne({ emails: { $elemMatch: { email, primary: true } } });
  if (!user) {
    throw new CustomError('Invalid email or password', ErrorTypes.INVALID_ARG);
  }

  if (biometricSignature) {
    const { identifierKey } = req;
    const { biometrics } = user.integrations;
    // get the publicKey to verify the signature
    const { biometricKey } = biometrics.find((biometric) => biometric._id.toString() === identifierKey);
    const isVerified = await verifyBiometric(email, biometricSignature, biometricKey);
    if (!isVerified) {
      throw new CustomError('invalid biometricKey', ErrorTypes.INVALID_ARG);
    }
  } else {
    const passwordMatch = await argon2.verify(user.password, password);
    if (!passwordMatch) {
      throw new CustomError('Invalid email or password', ErrorTypes.INVALID_ARG);
    }
  }

  const authKey = await Session.createSession(user._id.toString());

  await storeNewLogin(user._id.toString(), getUtcDate().toDate(), authKey);
  if (fcmToken && deviceInfo) {
    await addFCMAndDeviceInfo(user, fcmToken, deviceInfo);
  }

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

export const getUserById = async (_: IRequest, uid: string) => {
  try {
    const user = await UserModel.findById({ _id: uid });

    if (!user) throw new CustomError('User not found', ErrorTypes.NOT_FOUND);

    return user;
  } catch (err) {
    throw asCustomError(err);
  }
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

// provides endpoint for UI to check if an email already exists on a user
export const verifyUserDoesNotAlreadyExist = async (req: IRequest<{}, {}, IEmail>) => {
  const email = req.body.email?.toLowerCase();
  const userExists = await checkIfUserWithEmailExists(email);
  if (!userExists) return 'User with this email does not exist';
  throw new CustomError('User with this email already exists', ErrorTypes.CONFLICT);
};

// used internally in multiple services to update a user's password
const changePassword = async (req: IRequest, user: IUserDocument, newPassword: string) => {
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.valid) {
    throw new CustomError(`Invalid new password. ${passwordValidation.message}`, ErrorTypes.INVALID_ARG);
  }
  const hash = await argon2.hash(newPassword);
  const updatedUser = await updateUser(req, user, { password: hash });
  updatedUser.emails.find((e) => !!e.primary).status = UserEmailStatus.Verified;
  await updatedUser.save();
  // TODO: email user to notify them that their password has been changed.
  // TODO: remove when legacy users are removed
  await LegacyUserModel.findOneAndUpdate({ _id: user.legacyId }, { password: hash });
  return updatedUser;
};

export const requestEmailChange = async (req: IRequest<{}, {}, UserServiceTypes.IRequestEmailChangeBody>) => {
  const userPassword = req.body.password;
  const requestorPassword = req.requestor.password;
  const passwordMatch = await argon2.verify(requestorPassword, userPassword);

  if (!passwordMatch) throw new CustomError('Invalid password', ErrorTypes.INVALID_ARG);

  const user = req.requestor;
  const email = user.emails.find(e => e.primary)?.email;
  const name = user.integrations.marqeta.first_name || user.name;

  const verificationToken = await TokenService.createToken({
    user: user._id,
    type: TokenTypes.VerifyEmailChange,
    days: 1,
  });

  const changeEmailRequest = await ChangeEmailRequestModel.create({
    user: user._id,
    status: IChangeEmailProcessStatus.INCOMPLETE,
    verified: IChangeEmailVerificationStatus.UNVERIFIED,
    currentEmail: email,
    verificationToken,
  });

  if (!changeEmailRequest) throw new CustomError('Error creating email change request', ErrorTypes.SERVER);

  await sendChangeEmailRequestConfirmationEmail({ token: verificationToken.value, recipientEmail: email, name, user: user._id });
  return `Email change request sent to ${email}`;
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

  await updateContactEmail(prevEmail, email);
  await updateMarqetaUser(user.integrations.marqeta.userToken, { email });
};

export const updateReferralParams = async (user: IUserDocument, referralParams: IUrlParam[]) => {
  if (!user.integrations?.referrals?.params) {
    user.integrations.referrals = { params: referralParams };
  } else {
    const existingParams = user.integrations.referrals.params;
    for (const param of referralParams) {
      const existingParam = existingParams.find((p) => p.key === param.key);
      if (existingParam) {
        existingParam.value = param.value;
      } else {
        existingParams.push(param);
      }
    }

    user.integrations.referrals.params = existingParams;
    await user.save();
  }

  return user;
};

export const updateProfile = async (req: IRequest<{}, {}, IUserData>) => {
  let user = req.requestor;
  const updates = req.body;
  const legacyUser = await LegacyUserModel.findOne({ _id: user.legacyId });
  if (!!updates?.email) {
    updates.email = updates.email.toLowerCase()?.trim();
    if (!isemail.validate(updates.email)) throw new CustomError('Invalid email provided', ErrorTypes.INVALID_ARG);
    await updateUserEmail({ user, legacyUser, email: updates.email, req, pw: updates?.pw });
  }

  const email = user?.emails?.find((e) => e?.primary)?.email;
  const allowedFields: UserKeys[] = ['name', 'zipcode', 'integrations', 'referralParams'];
  // TODO: find solution to allow dynamic setting of fields
  for (const key of allowedFields) {
    if (typeof updates?.[key] === 'undefined') continue;
    const name = updates?.name?.replace(/\s/g, ' ');

    switch (key) {
      case 'name':
        user.name = name;
        if (legacyUser) legacyUser.name = name;
        break;
      case 'zipcode':
        user.zipcode = updates.zipcode;
        if (legacyUser) legacyUser.zipcode = updates.zipcode;
        // sync with active campaign
        if (email) {
          await syncUserAddressFields(email, {
            zipcode: updates.zipcode,
            state: getStateFromZipcode(updates.zipcode),
          });
        }
        break;
      case 'integrations':
        // update the address data in marqeta and km Db
        if (updates?.integrations?.marqeta) {
          const { marqeta } = updates.integrations;
          const { userToken } = user.integrations.marqeta;
          await updateMarqetaUser(userToken, marqeta);
          user.integrations.marqeta = Object.assign(user.integrations.marqeta, marqeta);
        }
        break;
      case 'referralParams':
        user = await updateReferralParams(user, updates.referralParams);
        break;
      default:
        break;
    }
  }

  if (legacyUser) await legacyUser.save();
  await user.save();
  return user;
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
  try {
    const plaidClient = new PlaidClient();

    const cards = await CardModel.find({ userId, status: CardStatus.Linked });
    const plaidCards = cards.filter((card) => !!card.integrations?.plaid?.accessToken);

    // Unlinking Plaid Access Tokens
    for (const card of plaidCards) {
      try {
        await plaidClient.invalidateAccessToken({ access_token: card.integrations.plaid.accessToken });
      } catch (error) {
        console.error(
          `Error unlinking plaid access token ${card.integrations.plaid.accessToken} from card: ${card._id} for user: ${userId}`,
        );
        console.error(`${error}`);
      }
    }

    await CardModel.deleteMany({ userId });
  } catch (error) {
    console.log('Error deleting linked card data', error);
  }
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
  const _token = await TokenService.getToken({
    value: token,
    type: TokenTypes.Password,
    consumed: false,
  });
  if (!_token) throw new CustomError('Token not found.', ErrorTypes.NOT_FOUND);
  return { message: 'OK' };
};

export const deleteAccountRequest = async (req: IRequest<{}, {}, IDeleteAccountRequest>) => {
  try {
    const { _id, name } = req.requestor;
    const { reason } = req.body;
    const { email } = req.requestor.emails.filter((e) => e.primary)[0];

    const user = await UserModel.findById(_id);
    if (!user) throw new CustomError('User not found', ErrorTypes.NOT_FOUND);

    const requestExists = await DeleteAccountRequestModel.findOne({ userId: _id });
    if (!!requestExists) {
      return { message: 'A request to delete your account has already been recieved and we are working on deleting your account.' };
    }

    const deleteAccountRequestDocument = new DeleteAccountRequestModel({
      userName: name,
      userEmail: email,
      userId: _id,
      reason,
    });

    const deleteAccountRequestSuccess = await deleteAccountRequestDocument.save();
    if (!deleteAccountRequestSuccess) {
      throw new CustomError('Unable to create your delete account request. Please email support@karmawallet.io.', ErrorTypes.UNPROCESSABLE);
    }

    sendDeleteAccountRequestEmail({
      user,
      deleteReason: reason,
      deleteAccountRequestId: deleteAccountRequestSuccess._id.toString(),
    });

    if (!!deleteAccountRequestSuccess) {
      return { message: 'Your account deletion request was successful and will be forwared to our support team.' };
    }
  } catch (err) {
    throw asCustomError(err);
  }
};

export const deleteUser = async (req: IRequest<{}, { userId: string }, {}>) => {
  try {
    // validate user id
    const { userId } = req.query;
    if (!userId || !Types.ObjectId.isValid(userId)) throw new CustomError('Invalid user id', ErrorTypes.INVALID_ARG);

    // get user from db
    const user = await UserModel.findById(userId);
    if (!user) throw new CustomError('Invalid user id', ErrorTypes.INVALID_ARG);

    // get user email
    const email = user.emails.find((userEmail) => userEmail.primary)?.email;

    // throw error if user has commissions
    const commissions = await CommissionModel.countDocuments({ user: user._id });
    if (commissions > 0) {
      throw new CustomError('Cannot delete users with commissions.', ErrorTypes.INVALID_ARG);
    }

    await closeKarmaCard(user);

    // throw error if user is enrolled in group
    const userGroups = await UserGroupModel.find({
      user: user._id,
      status: { $nin: [UserGroupStatus.Removed, UserGroupStatus.Banned, UserGroupStatus.Left] },
    });

    if (userGroups.length > 0) {
      for (const userGroup of userGroups) {
        await removeFromGroup(userGroup);
      }
    }

    await deleteKardUsersForUser(user as IUserDocument | Types.ObjectId);
    // delete user from active campaign
    if (email) await deleteContact(email);
    await cancelAllUserSubscriptions(user._id.toString());
    await deleteUserData(user._id);
    await UserModel.deleteOne({ _id: user._id });
  } catch (err) {
    throw asCustomError(err);
  }
  return { message: 'OK' };
};

export const checkIfEmailAlreadyInUse = async (email: string) => {
  email = email?.toLowerCase();
  const user = await UserModel.findOne({ 'emails.email': email });
  if (!!user) throw new CustomError(`Email: ${email} already belongs to a user.`, ErrorTypes.CONFLICT);
  return true;
};

export const formatMarqetaClosedEmail = (email: string) => {
  if (!email) return '';

  const emailParts = email.split('@');
  return `${emailParts[0]}+closed@${emailParts[1]}`;
};

export const checkIfUserPassedInternalKycAndUpdateMarqetaStatus = async (
  entity: IUserDocument | IVisitorDocument,
) => {
  if (!passedInternalKyc(entity.integrations.persona)) {
    await updateMarqetaUserStatus(entity, IMarqetaUserStatus.SUSPENDED, MarqetaReasonCodeEnum.AccountUnderReview);
    return true;
  }
  return true;
};

export const updateUserUrlParams = async (userObject: IUserDocument, urlParams: IUrlParam[]): Promise<void> => {
  const existingParams = userObject.integrations?.referrals?.params;
  const newParams = filterToValidQueryParams(urlParams);
  const params = !!existingParams ? [...newParams, ...existingParams] : newParams;
  const duplicatesRemoved = Array.from(new Set(params));
  if (!existingParams) {
    userObject.integrations.referrals = { params: duplicatesRemoved };
  } else {
    userObject.integrations.referrals.params = duplicatesRemoved;
  }
  await userObject.save();
};

export const updateVisitorUrlParams = async (visitorObject: IVisitorDocument, urlParams: IUrlParam[]): Promise<void> => {
  const existingParams = visitorObject?.integrations?.urlParams;
  const newParams = filterToValidQueryParams(urlParams);
  const params = !!existingParams ? [...newParams, ...existingParams] : newParams;
  if (!visitorObject.integrations) visitorObject.integrations = {};
  const duplicatesRemoved = Array.from(new Set(params));
  visitorObject.integrations.urlParams = duplicatesRemoved;
  visitorObject.integrations.urlParams = duplicatesRemoved;
  await visitorObject.save();
};

export const verifyEmailChange = async (req: IRequest<{}, {}, UserServiceTypes.IVerifyEmailChange>) => {
  const { verifyToken, email, password } = req.body;

  const checkIfNewEmailAlreadyInUse = await verifyUserDoesNotAlreadyExist(req);
  if (!checkIfNewEmailAlreadyInUse) throw new CustomError('Email already in use.', ErrorTypes.CONFLICT);

  const checkIfTokenExists = await TokenService.getTokenAndConsume({ value: verifyToken, type: TokenTypes.VerifyEmailChange });
  if (!checkIfTokenExists) throw new CustomError('Invalid or expired link, please request a new email change.', ErrorTypes.INVALID_ARG);

  const tokenIsExpired = checkIfTokenExists?.expires < getUtcDate().toDate();
  if (!!tokenIsExpired) throw new CustomError('Link expired, please request a new email change.', ErrorTypes.INVALID_ARG);

  const user = await UserModel.findById(checkIfTokenExists.user);

  const checkIfPasswordMatches = await argon2.verify(user.password, password);
  if (!checkIfPasswordMatches) throw new CustomError('Invalid password.', ErrorTypes.INVALID_ARG);

  await ChangeEmailRequestModel.findOneAndUpdate({ user: user._id }, { verified: IChangeEmailVerificationStatus.VERIFIED, proposedEmail: email });

  const affirmationToken = await TokenService.createToken({
    user,
    type: TokenTypes.AffirmEmailChange,
    days: 1,
  });

  await sendChangeEmailRequestAffirmationEmail({ token: affirmationToken.value, recipientEmail: email, name: user.name, user: user._id });

  return 'Email change verified, check your new email for further instructions';
};

export const affirmEmailChange = async (req: IRequest<{}, {}, UserServiceTypes.IAffirmEmailChange>) => {
  const { affirmToken } = req.body;

  const checkIfTokenExists = await TokenService.getTokenAndConsume({ value: affirmToken, type: TokenTypes.AffirmEmailChange });
  if (!checkIfTokenExists) throw new CustomError('Invalid or expired link, please request a new email change.', ErrorTypes.INVALID_ARG);

  const tokenIsExpired = checkIfTokenExists?.expires < getUtcDate().toDate();
  if (!!tokenIsExpired) throw new CustomError('Link expired, please request a new email change.', ErrorTypes.INVALID_ARG);

  try {
    const user = await UserModel.findById(checkIfTokenExists.user);
    if (!user) throw new CustomError('User not found.', ErrorTypes.NOT_FOUND);

    const changeEmailRequest = await ChangeEmailRequestModel.findOne({ user: user._id });
    if (!changeEmailRequest) throw new CustomError('Email change request not found.', ErrorTypes.NOT_FOUND);

    const currentPrimaryEmail = user.emails.find(email => email.primary === true);
    currentPrimaryEmail.email = changeEmailRequest.proposedEmail;

    if (user.integrations.marqeta) {
      user.integrations.marqeta.email = changeEmailRequest.proposedEmail;
    }

    const saveEmailChange = await user.save();
    if (!saveEmailChange) throw new CustomError('Error saving email change.', ErrorTypes.SERVER);

    await ChangeEmailRequestModel.findOneAndUpdate({ user: user._id }, { status: IChangeEmailProcessStatus.COMPLETE });
    await updateMarqetaUser(user.integrations.marqeta.userToken, { email: changeEmailRequest.proposedEmail });

    return changeEmailRequest.proposedEmail;
  } catch (err) {
    return err;
  }
};
