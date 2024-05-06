import { SafeParseError, z, ZodError } from 'zod';
import * as UserService from '../services/user';
import * as UserUtils from '../services/user/utils';
import * as output from '../services/output';
import { ErrorTypes } from '../lib/constants';
import CustomError, { asCustomError } from '../lib/customError';
import { IRequestHandler } from '../types/request';
import * as UserVerificationService from '../services/user/verification';
import * as UserTestIdentityService from '../services/user/testIdentities';
import * as UserServiceTypes from '../services/user/types';
import * as SupportTicketService from '../services/supportTicket';
import { KWRateLimiterKeyPrefixes, setRateLimiterHeaders, unblockFromEmailLimiterOnSuccess } from '../middleware/rateLimiter';
import { formatZodFieldErrors, getShareableFieldErrors, getZodEnumSchemaFromTypescriptEnum, nameValidation, nanoIdValidation, optionalNameValidation, optionalObjectReferenceValidation, optionalUuidValidation, optionalZipCodeValidation } from '../lib/validation';
import { DeleteRequestReason } from '../models/deleteAccountRequest';

export const register: IRequestHandler<{}, {}, UserServiceTypes.IUserData> = async (req, res) => {
  try {
    const { body } = req;

    const registerUserSchema = z.object({
      password: z.string(),
      token: nanoIdValidation,
      name: nameValidation,
      promo: optionalObjectReferenceValidation,
      zipcode: optionalZipCodeValidation,
    });

    const parsed = registerUserSchema.safeParse(req.body);
    if (!parsed.success) {
      const fieldErrors = ((parsed as SafeParseError<UserServiceTypes.IUserData>)?.error as ZodError)?.formErrors?.fieldErrors;
      console.log(formatZodFieldErrors(fieldErrors));
      throw new CustomError(`${getShareableFieldErrors(fieldErrors) || 'Error parsing request'}`, ErrorTypes.INVALID_ARG);
    }

    const { password, name, token, promo, zipcode } = body;
    const { user, authKey, groupCode } = await UserService.register({ password, name, token, promo, zipcode });
    output.api(req, res, { user: UserUtils.getShareableUser(user), groupCode }, authKey);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const login: IRequestHandler<{}, {}, UserServiceTypes.ILoginData> = async (req, res) => {
  try {
    // TODO: limit failed attempts w/ https://github.com/animir/node-rate-limiter-flexible/wiki/Overall-example#minimal-protection-against-password-brute-force
    const { password, email, biometricSignature, fcmToken, deviceInfo } = req.body;
    const loginSchemaData: any = {
      email: z.string().email(),
      fcmToken: z.string().optional(),
      deviceInfo: z.object({
        manufacturer: z.string().optional(),
        bundleId: z.string().optional(),
        deviceId: z.string().optional(),
        apiLevel: z.string().optional(),
        applicationName: z.string().optional(),
        model: z.string().optional(),
        buildNumber: z.string().optional(),
      }).optional(),
    };

    if (!!biometricSignature && !password) {
      loginSchemaData.biometricSignature = z.string();
    } else {
      loginSchemaData.password = z.string();
    }

    const loginSchema = z.object(loginSchemaData);
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      const fieldErrors = ((parsed as SafeParseError<UserServiceTypes.ILoginData>)?.error as ZodError)?.formErrors?.fieldErrors;
      console.log(formatZodFieldErrors(fieldErrors));
      throw new CustomError(`${getShareableFieldErrors(fieldErrors) || 'Error parsing request'}`, ErrorTypes.INVALID_ARG);
    }

    const { user, authKey } = await UserService.login(req, {
      biometricSignature,
      password,
      email,
      fcmToken,
      deviceInfo,
    });

    output.api(req, res, UserUtils.getShareableUser(user), authKey);
  } catch (err) {
    setRateLimiterHeaders(req, res);
    output.error(req, res, asCustomError(err));
  }
};

export const deleteAccountRequest: IRequestHandler<{}, {}, UserServiceTypes.IDeleteAccountRequest> = async (req, res) => {
  try {
    const deleteAccountRequestSchema = z.object({
      reason: getZodEnumSchemaFromTypescriptEnum(DeleteRequestReason),
    });

    const parsed = deleteAccountRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      const fieldErrors = ((parsed as SafeParseError<UserServiceTypes.IDeleteAccountRequest>)?.error as ZodError)?.formErrors?.fieldErrors;
      console.log(formatZodFieldErrors(fieldErrors));
      throw new CustomError(`${getShareableFieldErrors(fieldErrors) || 'Error parsing request'}`, ErrorTypes.INVALID_ARG);
    }
    const response = await UserService.deleteAccountRequest(req);
    output.api(req, res, response);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const requestEmailChange: IRequestHandler<{}, {}, UserService.IRequestEmailChangeBody> = async (req, res) => {
  try {
    const response = await UserService.requestEmailChange(req);
    output.api(req, res, response);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const submitSupportTicket: IRequestHandler<{}, {}, SupportTicketService.ISubmitSupportTicketRequest> = async (req, res) => {
  try {
    const response = await SupportTicketService.submitSupportTicket(req);
    output.api(req, res, response);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getProfile: IRequestHandler = async (req, res) => {
  try {
    output.api(req, res, UserUtils.getShareableUser(req.requestor));
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

export const updateProfile: IRequestHandler<{}, {}, UserServiceTypes.IUserData> = async (req, res) => {
  try {
    const updateProfileSchema = z.object({
      name: optionalNameValidation,
      email: z.string().email().optional(),
      zipcode: optionalZipCodeValidation,
      integrations: z
        .object({
          marqeta: z.object({
            userToken: optionalUuidValidation,
          }).optional(),
        })
        .optional(),
    });

    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      const fieldErrors = ((parsed as SafeParseError<UserServiceTypes.IUserData>)?.error as ZodError)?.formErrors?.fieldErrors;
      console.log(formatZodFieldErrors(fieldErrors));
      throw new CustomError(`${getShareableFieldErrors(fieldErrors) || 'Error parsing request'}`, ErrorTypes.INVALID_ARG);
    }
    const user = await UserService.updateProfile(req);
    output.api(req, res, UserUtils.getShareableUser(user));
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const updatePassword: IRequestHandler<{}, {}, UserServiceTypes.IUpdatePasswordBody> = async (req, res) => {
  try {
    const user = await UserService.updatePassword(req);
    output.api(req, res, UserUtils.getShareableUser(user));
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const createPasswordResetToken: IRequestHandler<{}, {}, UserServiceTypes.ILoginData> = async (req, res) => {
  try {
    const data = await UserService.createPasswordResetToken(req);
    output.api(req, res, data);
  } catch (err) {
    setRateLimiterHeaders(req, res);
    output.error(req, res, asCustomError(err));
  }
};

export const verifyPasswordResetToken: IRequestHandler<{}, {}, UserServiceTypes.IVerifyTokenBody> = async (req, res) => {
  try {
    const verifyPasswordResetTokenSchema = z.object({
      token: nanoIdValidation,
    });

    const parsed = verifyPasswordResetTokenSchema.safeParse(req.body);
    if (!parsed.success) {
      const fieldErrors = ((parsed as SafeParseError<UserServiceTypes.IVerifyTokenBody>)?.error as ZodError)?.formErrors?.fieldErrors;
      console.log(formatZodFieldErrors(fieldErrors));
      throw new CustomError(`${getShareableFieldErrors(fieldErrors) || 'Error parsing request'}`, ErrorTypes.INVALID_ARG);
    }
    const data = await UserService.verifyPasswordResetToken(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const checkIfEmailAlreadyInUse: IRequestHandler<{}, {}, UserServiceTypes.IEmail> = async (req, res) => {
  try {
    const checkIfEmailAlreadyInUseSchema = z.object({
      email: z.string().email(),
    });

    const parsed = checkIfEmailAlreadyInUseSchema.safeParse(req.body);
    if (!parsed.success) {
      const fieldErrors = ((parsed as SafeParseError<UserServiceTypes.IEmail>)?.error as ZodError)?.formErrors?.fieldErrors;
      console.log(formatZodFieldErrors(fieldErrors));
      throw new CustomError(`${getShareableFieldErrors(fieldErrors) || 'Error parsing request'}`, ErrorTypes.INVALID_ARG);
    }
    const data = await UserVerificationService.verifyUserDoesNotAlreadyExist(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const resetPasswordFromToken: IRequestHandler<{}, {}, UserServiceTypes.ILoginData & UserServiceTypes.IUpdatePasswordBody> = async (
  req,
  res,
) => {
  try {
    const resetPasswordFromTokenSchema = z.object({
      newPassword: z.string(),
      token: nanoIdValidation,
    });

    const parsed = resetPasswordFromTokenSchema.safeParse(req.body);
    if (!parsed.success) {
      const fieldErrors = ((parsed as SafeParseError<UserServiceTypes.ILoginData & UserServiceTypes.IUpdatePasswordBody>)?.error as ZodError)?.formErrors?.fieldErrors;
      console.log(formatZodFieldErrors(fieldErrors));
      throw new CustomError(`${getShareableFieldErrors(fieldErrors) || 'Error parsing request'}`, ErrorTypes.INVALID_ARG);
    }
    const user = await UserService.resetPasswordFromToken(req);
    output.api(req, res, UserUtils.getShareableUser(user));
    await unblockFromEmailLimiterOnSuccess(req, res, KWRateLimiterKeyPrefixes.Login);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const resendEmailVerification: IRequestHandler<{}, {}, Partial<UserServiceTypes.IEmailVerificationData>> = async (req, res) => {
  try {
    const data = await UserVerificationService.resendEmailVerification(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const verifyEmail: IRequestHandler<{}, {}, Partial<UserServiceTypes.IEmailVerificationData>> = async (req, res) => {
  try {
    const verifyEmailSchema = z.object({
      tokenValue: nanoIdValidation,
    });

    const parsed = verifyEmailSchema.safeParse(req.body);
    if (!parsed.success) {
      const fieldErrors = ((parsed as SafeParseError<UserServiceTypes.IEmailVerificationData>)?.error as ZodError)?.formErrors?.fieldErrors;
      console.log(formatZodFieldErrors(fieldErrors));
      throw new CustomError(`${getShareableFieldErrors(fieldErrors) || 'Error parsing request'}`, ErrorTypes.INVALID_ARG);
    }

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
      data.map((d) => UserUtils.getShareableUser(d)),
    );
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const verifyEmailChange: IRequestHandler<{}, {}, UserServiceTypes.IVerifyEmailChange> = async (req, res) => {
  try {
    const verifyEmailChangeSchema = z.object({
      email: z.string().email(),
      password: z.string(),
      verifyToken: nanoIdValidation,
    });

    const parsed = verifyEmailChangeSchema.safeParse(req.body);
    if (!parsed.success) {
      const fieldErrors = ((parsed as SafeParseError<UserServiceTypes.IEmailVerificationData>)?.error as ZodError)?.formErrors?.fieldErrors;
      console.log(formatZodFieldErrors(fieldErrors));
      throw new CustomError(`${getShareableFieldErrors(fieldErrors) || 'Error parsing request'}`, ErrorTypes.INVALID_ARG);
    }

    const data = await UserService.verifyEmailChange(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const affirmEmailChange: IRequestHandler<{}, {}, UserServiceTypes.IAffirmEmailChange> = async (req, res) => {
  try {
    const verifyEmailChangeSchema = z.object({
      affirmToken: nanoIdValidation,
    });

    const parsed = verifyEmailChangeSchema.safeParse(req.body);
    if (!parsed.success) {
      const fieldErrors = ((parsed as SafeParseError<UserServiceTypes.IEmailVerificationData>)?.error as ZodError)?.formErrors?.fieldErrors;
      console.log(formatZodFieldErrors(fieldErrors));
      throw new CustomError(`${getShareableFieldErrors(fieldErrors) || 'Error parsing request'}`, ErrorTypes.INVALID_ARG);
    }

    const data = await UserService.affirmEmailChange(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
