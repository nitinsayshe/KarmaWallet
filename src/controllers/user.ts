import * as UserService from '../services/user';
import * as output from '../services/output';
import { verifyRequiredFields } from '../lib/requestData';
import { ErrorTypes } from '../lib/constants';
import CustomError, { asCustomError } from '../lib/customError';
import { IRequestHandler } from '../types/request';
import * as UserVerificationService from '../services/user/verification';

export const register: IRequestHandler<{}, {}, UserService.IUserData> = async (req, res) => {
  try {
    const { body } = req;
    const requiredFields = ['password', 'email', 'name', 'subscribedUpdates'];

    const { isValid, missingFields } = verifyRequiredFields(requiredFields, body);
    if (!isValid) {
      output.error(req, res, new CustomError(`Invalid input. Body requires the following fields: ${missingFields.join(', ')}.`, ErrorTypes.INVALID_ARG));
      return;
    }
    const {
      password, email, name, zipcode, subscribedUpdates,
    } = body;
    const { user, authKey } = await UserService.register(req, {
      password, email, name, zipcode, subscribedUpdates,
    });
    output.api(req, res, UserService.getShareableUser(user), authKey);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const login: IRequestHandler<{}, {}, UserService.ILoginData> = async (req, res) => {
  try {
    // TODO: limit failed attempts w/ https://github.com/animir/node-rate-limiter-flexible/wiki/Overall-example#minimal-protection-against-password-brute-force
    const { password, email } = req.body;
    const { user, authKey } = await UserService.login(req, {
      password, email,
    });
    output.api(req, res, UserService.getShareableUser(user), authKey);
  } catch (err) {
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

export const resetPasswordFromToken: IRequestHandler<{}, {}, (UserService.ILoginData & UserService.IUpdatePasswordBody)> = async (req, res) => {
  try {
    const user = await UserService.resetPasswordFromToken(req);
    output.api(req, res, UserService.getShareableUser(user));
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const resendEmailVerification: IRequestHandler<{}, {}, Partial<UserService.IEmailVerificationData>> = async (req, res) => {
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
