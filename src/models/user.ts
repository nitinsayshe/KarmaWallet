import {
  Schema,
  model,
  Document,
  Model,
  ObjectId,
} from 'mongoose';
import { IModel, IRef } from '../types/model';
import { IGroup } from './group';
import { UserRoles } from '../lib/constants';

export enum UserGroupRole {
  Admin = 'admin',
  Member = 'member',
}

export interface IRareUserIntegration {
  userId: string;
}

export interface IUserGroup {
  group: IRef<ObjectId, IGroup>;
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

const userSchema = new Schema({
  _id: { type: String },
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  password: { type: String, required: true },
  plaidItems: { type: [String], ref: 'plaidItem', default: [] },
  dateJoined: { type: Date, default: new Date() },
  zipcode: { type: String },
  subscribedUpdates: { type: Boolean, default: true },
  groups: [{
    type: Schema.Types.ObjectId,
    ref: 'user_group',
  }],
  role: {
    type: String,
    default: 'none',
    enum: Object.values(UserRoles),
  },
  emailVerified: { type: Boolean, default: false },
  lastModified: { type: Date, default: new Date() },
  v2Id: { type: String },
  integrations: {
    rare: {
      type: {
        userId: { type: String },
      },
    },
  },
});

export const UserModel = model<IUserDocument, Model<IUser>>('user', userSchema);
