import {
  Schema,
  model,
  Document,
  Model,
} from 'mongoose';
import { IModel } from '../../types/model';
import schemaDefinition from '../schema/user';
import { IGroupDocument } from './group';

export enum UserGroupRole {
  Admin = 'admin',
  Member = 'member',
}

export interface IRareUserIntegration {
  userId: string;
}

export interface IUserGroup {
  group: IGroupDocument['_id'];
  role: UserGroupRole;
}

export interface IUserIntegrations {
  rare: IRareUserIntegration;
}

export interface IUser {
  _id: string;
  email: string;
  name: string;
  password: string;
  dateJoined: Date;
  zipcode: string;
  subscribedUpdates: boolean;
  groups: IUserGroup[];
  role: string; // cannot mark as UserRoles due to how mongoose treats enums
  emailVerified: boolean;
  lastModified: Date;
  v2Id: string;
  integration: IUserIntegrations;
}

export interface IUserDocument extends IUser, Document {
  _id: string;
}
export type IUserModel = IModel<IUser>;

export const UserModel = model<IUserDocument, Model<IUser>>('user', new Schema(schemaDefinition));
