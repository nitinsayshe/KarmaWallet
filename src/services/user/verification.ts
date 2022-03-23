import isemail from 'isemail';
import dayjs from 'dayjs';
import {
  IUserDocument, UserModel,
  UserEmailStatus,
} from '../../models/user';
import CustomError from '../../lib/customError';
import {
  TokenTypes, emailVerificationDays, ErrorTypes,
} from '../../lib/constants';
import * as TokenService from '../token';
import { IRequest } from '../../types/request';
import { sendEmailVerification } from '../email';
import { UserGroupModel, UserGroupStatus } from '../../models/userGroup';

export interface IEmailVerificationData {
  email: string;
  code: string;
  tokenValue: string;
}

export const emailChecks = (user: IUserDocument, email: string) => {
  if (!isemail.validate(email, { minDomainAtoms: 2 })) {
    throw new CustomError('Invalid email format.', ErrorTypes.INVALID_ARG);
  }
  if (!user?.emails?.length) {
    throw new CustomError(`Email: ${email} does not exist for this user.`, ErrorTypes.INVALID_ARG);
  }
  const existingEmail = user.emails.find(e => e.email === email);
  if (!existingEmail) {
    throw new CustomError(`Email: ${email} does not exist for this user.`, ErrorTypes.INVALID_ARG);
  }
  if (existingEmail.status === UserEmailStatus.Verified) {
    throw new CustomError(`Email: ${email} already verified.`, ErrorTypes.INVALID_ARG);
  }
};

export const resendEmailVerification = async (req: IRequest<{}, {}, Partial<IEmailVerificationData>>) => {
  const { requestor } = req;
  const { email } = req.body;
  const days = emailVerificationDays;
  emailChecks(requestor, email);
  const token = await TokenService.createToken({
    user: requestor, days, type: TokenTypes.Email, resource: { email },
  });
  await sendEmailVerification({
    name: requestor.name, token: token.value, recipientEmail: email,
  });
  return `Verfication instructions have been sent to your provided email address. This token will expire in ${days} days.`;
};

export const verifyEmail = async (req: IRequest<{}, {}, Partial<IEmailVerificationData>>) => {
  const { requestor } = req;
  const { tokenValue } = req.body;

  if (!tokenValue) {
    throw new CustomError('No token value included.', ErrorTypes.INVALID_ARG);
  }
  const token = await TokenService.getTokenAndConsume(requestor, tokenValue, TokenTypes.Email);
  if (!token) {
    throw new CustomError('Token not found. Please request email verification again.', ErrorTypes.INVALID_ARG);
  }
  const email = token?.resource?.email;
  if (!email) {
    throw new CustomError('This token is not associated with an email address.', ErrorTypes.INVALID_ARG);
  }
  await UserModel.findOneAndUpdate({ _id: requestor._id, 'emails.email': email }, { 'emails.$.status': UserEmailStatus.Verified, lastModified: dayjs().utc().toDate() }, { new: true });
  // TODO: update to verified when support for owner approval is added.
  await UserGroupModel.updateMany({ status: UserGroupStatus.Unverified, user: requestor, email }, { status: UserGroupStatus.Verified });
  return { email };
};
