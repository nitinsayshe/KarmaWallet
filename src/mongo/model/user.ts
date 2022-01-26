import {
  Schema, model, Document,
} from 'mongoose';
import schemaDefinition from '../schema/user';
import { IGroupModel } from './group';

export enum UserGroupRole {
  Admin = 'admin',
  Member = 'member',
}

export interface IRareUserIntegration {
  userId: string;
}

export interface IUserGroup {
  group: IGroupModel['id'];
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

export interface IUserModel extends IUser, Document {
  _id: string; // this is needed because our user _id and Document._id do not match (type string !== type ObjectId)
}

export const UserModel = model<IUserModel>('user', new Schema(schemaDefinition));
