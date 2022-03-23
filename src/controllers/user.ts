import * as User from '../services/user';
import * as output from '../services/output';
import { allowFields, verifyRequiredFields } from '../lib/requestData';
import { ErrorTypes, TokenTypes } from '../lib/constants';
import * as Token from '../services/token';
import { isValidEmailFormat } from '../lib/string';
import CustomError, { asCustomError } from '../lib/customError';
import { IRequestHandler } from '../types/request';
import * as UserVerificationService from '../services/user/verification';

interface IUpdatePasswordBody {
  newPassword: string;
  password: string;
}

export const register: IRequestHandler<{}, {}, User.IUserData> = async (req, res) => {
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
    const { user, authKey } = await User.register(req, {
      password, email, name, zipcode, subscribedUpdates,
    });
    output.api(req, res, User.getShareableUser(user), authKey);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const login: IRequestHandler<{}, {}, User.ILoginData> = async (req, res) => {
  try {
    // TODO: limit failed attempts w/ https://github.com/animir/node-rate-limiter-flexible/wiki/Overall-example#minimal-protection-against-password-brute-force
    const { password, email } = req.body;
    const { user, authKey } = await User.login(req, {
      password, email,
    });
    output.api(req, res, User.getShareableUser(user), authKey);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getProfile: IRequestHandler = async (req, res) => {
  try {
    output.api(req, res, User.getShareableUser(req.requestor));
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const logout: IRequestHandler = async (req, res) => {
  try {
    await User.logout(req, req.authKey);
    output.api(req, res, 'Success');
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const updateProfile: IRequestHandler = async (req, res) => {
  try {
    const { body } = req;
    const { _id } = req.requestor;
    const allowedFields = ['name', 'email', 'zipcode', 'subscribedUpdates'];
    const updates = allowFields(allowedFields, body);
    if (!Object.values(updates).length) {
      output.error(req, res, new CustomError('No valid update fields in request.'));
      return;
    }
    const user = await User.updateProfile(req, _id, updates);
    output.api(req, res, User.getShareableUser(user));
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const updatePassword: IRequestHandler<{}, {}, IUpdatePasswordBody> = async (req, res) => {
  try {
    const { newPassword, password } = req.body;
    if (!newPassword || !password) {
      output.error(req, res, new CustomError('New and current passwords required.', ErrorTypes.INVALID_ARG));
      return;
    }
    const user = await User.updatePassword(req, newPassword, password);
    output.api(req, res, User.getShareableUser(user));
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const createPasswordResetToken: IRequestHandler<{}, {}, User.ILoginData> = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !isValidEmailFormat(email)) {
      output.error(req, res, new CustomError('Invalid email.', ErrorTypes.INVALID_ARG));
      return;
    }
    const data = await User.createPasswordResetToken(req, email);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const checkPasswordResetToken: IRequestHandler<{}, {}, User.ILoginData> = async (req, res) => {
  try {
    const { email, token } = req.body;
    if (!token) {
      output.error(req, res, new CustomError('Invalid token.', ErrorTypes.AUTHENTICATION));
      return;
    }
    if (!email || !isValidEmailFormat(email)) {
      output.error(req, res, new CustomError('Invalid email.', ErrorTypes.AUTHENTICATION));
      return;
    }
    const user = await User.getUser(req, { email });
    if (!user) {
      output.error(req, res, new CustomError('Not found', ErrorTypes.NOT_FOUND));
      return;
    }
    const data = await Token.getToken(user, token, TokenTypes.Password);
    if (!data) {
      output.error(req, res, new CustomError('Not found', ErrorTypes.NOT_FOUND));
      return;
    }
    output.api(req, res, { created: data.createdOn, expires: data.expires, valid: true });
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const resetPasswordFromToken: IRequestHandler<{}, {}, (User.ILoginData & IUpdatePasswordBody)> = async (req, res) => {
  try {
    const { newPassword, token, email } = req.body;
    const requiredFields = ['newPassword', 'token', 'email'];
    const { isValid, missingFields } = verifyRequiredFields(requiredFields, req.body);
    if (!isValid) {
      output.error(req, res, new CustomError(`Invalid input. Body requires the following fields: ${missingFields.join(', ')}.`, ErrorTypes.INVALID_ARG));
      return;
    }
    if (!isValidEmailFormat(email)) {
      output.error(req, res, new CustomError('Invalid email.', ErrorTypes.INVALID_ARG));
      return;
    }
    const user = await User.resetPasswordFromToken(req, email, token, newPassword);
    output.api(req, res, User.getShareableUser(user));
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const resendEmailVerification: IRequestHandler<{}, {}, Partial<User.IEmailVerificationData>> = async (req, res) => {
  try {
    const data = await UserVerificationService.resendEmailVerification(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const verifyEmail: IRequestHandler<{}, {}, Partial<User.IEmailVerificationData>> = async (req, res) => {
  try {
    const data = await UserVerificationService.verifyEmail(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
