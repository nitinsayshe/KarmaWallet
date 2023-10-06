import * as UserService from '../services/user';
import * as output from '../services/output';
import { verifyRequiredFields } from '../lib/requestData';
import { ErrorTypes } from '../lib/constants';
import CustomError, { asCustomError } from '../lib/customError';
import { IRequestHandler } from '../types/request';
import * as UserVerificationService from '../services/user/verification';
import * as UserTestIdentityService from '../services/user/testIdentities';
import { KWRateLimiterKeyPrefixes, setRateLimiterHeaders, unblockFromEmailLimiterOnSuccess } from '../middleware/rateLimiter';

export const register: IRequestHandler<{}, {}, UserService.IUserData> = async (req, res) => {
  try {
    const { body } = req;
    const requiredFields = ['password', 'token', 'name'];

    const { isValid, missingFields } = verifyRequiredFields(requiredFields, body);
    if (!isValid) {
      output.error(
        req,
        res,
        new CustomError(
          `Invalid input. Body requires the following fields: ${missingFields.join(', ')}.`,
          ErrorTypes.INVALID_ARG,
        ),
      );
      return;
    }
    const { password, name, token, promo } = body;
    const { user, authKey, groupCode } = await UserService.register(req, { password, name, token, promo });
    output.api(req, res, { user: UserService.getShareableUser(user), groupCode }, authKey);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const login: IRequestHandler<{}, {}, UserService.ILoginData> = async (req, res) => {
  try {
    const { password, email } = req.body;
    const { user, authKey } = await UserService.login(req, {
      password,
      email,
    });
    output.api(req, res, UserService.getShareableUser(user), authKey);
  } catch (err) {
    setRateLimiterHeaders(req, res);
    output.error(req, res, asCustomError(err));
  }
};

export const getProfile: IRequestHandler = async (req, res) => {
  try {
    output.api(req, res, UserService.getShareableUser(req.requestor));
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const logout: IRequestHandler = async (req, res) => {
  try {
    await UserService.logout(req, req.authKey);
    output.api(req, res, 'Success');
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const updateProfile: IRequestHandler<{}, {}, UserService.IUserData> = async (req, res) => {
  try {
    const user = await UserService.updateProfile(req);
    output.api(req, res, UserService.getShareableUser(user));
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const updatePassword: IRequestHandler<{}, {}, UserService.IUpdatePasswordBody> = async (req, res) => {
  try {
    const user = await UserService.updatePassword(req);
    output.api(req, res, UserService.getShareableUser(user));
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const createPasswordResetToken: IRequestHandler<{}, {}, UserService.ILoginData> = async (req, res) => {
  try {
    const data = await UserService.createPasswordResetToken(req);
    output.api(req, res, data);
  } catch (err) {
    setRateLimiterHeaders(req, res);
    output.error(req, res, asCustomError(err));
  }
};

export const verifyPasswordResetToken: IRequestHandler<{}, {}, UserService.IVerifyTokenBody> = async (req, res) => {
  try {
    const data = await UserService.verifyPasswordResetToken(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const checkIfEmailAlreadyInUse: IRequestHandler<{}, {}, UserService.IEmail> = async (req, res) => {
  try {
    const data = await UserService.checkIfEmailAlreadyInUse(req.body.email);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const resetPasswordFromToken: IRequestHandler<
{},
{},
UserService.ILoginData & UserService.IUpdatePasswordBody
> = async (req, res) => {
  try {
    const user = await UserService.resetPasswordFromToken(req);
    output.api(req, res, UserService.getShareableUser(user));
    await unblockFromEmailLimiterOnSuccess(req, res, KWRateLimiterKeyPrefixes.Login);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const resendEmailVerification: IRequestHandler<{}, {}, Partial<UserService.IEmailVerificationData>> = async (
  req,
  res,
) => {
  try {
    const data = await UserVerificationService.resendEmailVerification(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const verifyEmail: IRequestHandler<{}, {}, Partial<UserService.IEmailVerificationData>> = async (req, res) => {
  try {
    const data = await UserVerificationService.verifyEmail(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getTestIdentities: IRequestHandler<{}, {}, {}> = async (req, res) => {
  try {
    const data = await UserTestIdentityService.getTestIdentities();
    output.api(
      req,
      res,
      data.map((d) => UserService.getShareableUser(d)),
    );
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
