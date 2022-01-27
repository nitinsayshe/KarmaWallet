import { FilterQuery } from 'mongoose';
import argon2 from 'argon2';
import CustomError from '../../lib/customError';
import { IUser, IUserGroup, UserModel } from '../../mongo/model/user';
import { ErrorTypes, UserRoles, ZIPCODE_REGEX } from '../../lib/constants';
import { validatePassword } from './utils/validate';

export interface ILoginData {
  email: string;
  password: string;
}

export interface ICreateUserData extends ILoginData {
  name: string;
  zipcode: string;
  subscribedUpdates: boolean;
  role?: UserRoles;
  groups?: IUserGroup[];
}

export const findByIdAndUpdate = async (uid: string, updates: Partial<IUser>) => {
  const updatedUser = await UserModel.findByIdAndUpdate(uid, { ...updates, lastModified: new Date() }, { new: true });
  return updatedUser;
};

export const findOneAndUpdate = async (query: FilterQuery<any>, updates: Partial<IUser>) => {
  const updatedUser = await UserModel.findOneAndUpdate(query, { ...updates, lastModified: new Date() }, { new: true });
  return updatedUser;
};

export const changePassword = async (uid: string, newPassword: string) => {
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.valid) {
    throw new CustomError(`Invalid new password. ${passwordValidation.message}`, ErrorTypes.INVALID_ARG);
  }
  const hash = await argon2.hash(newPassword);
  const user = await findByIdAndUpdate(uid, { password: hash });
  return user;
};

export const create = async ({
  password,
  name,
  email,
  subscribedUpdates,
  zipcode,
  role = UserRoles.None,
  groups = [],
}: ICreateUserData) => {
  if (!password) throw new CustomError('A password is required.', ErrorTypes.INVALID_ARG);
  if (!name) throw new CustomError('A name is required.', ErrorTypes.INVALID_ARG);
  if (!email) throw new CustomError('A email is required.', ErrorTypes.INVALID_ARG);

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    throw new CustomError(`Invalid password. ${passwordValidation.message}`, ErrorTypes.INVALID_ARG);
  }
  const hash = await argon2.hash(password);
  const emailExists = await UserModel.findOne({ email });
  if (emailExists) {
    throw new CustomError('Email already in use.', ErrorTypes.CONFLICT);
  }

  if (!!zipcode && !ZIPCODE_REGEX.test(zipcode)) throw new CustomError('Invalid zipcode found.', ErrorTypes.INVALID_ARG);

  if (role) {
    switch (role) {
      case UserRoles.None:
      case UserRoles.Member:
      case UserRoles.Admin:
      case UserRoles.SuperAdmin:
        break;
      default:
        throw new CustomError('Invalid role found.', ErrorTypes.INVALID_ARG);
    }
  }
  const userInstance = new UserModel({
    name,
    email,
    password: hash,
    subscribedUpdates,
    zipcode,
    role,
    groups,
  });
  const user = await userInstance.save();
  return user;
};
