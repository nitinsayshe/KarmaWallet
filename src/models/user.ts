import {
  Schema,
  model,
  Document,
  Model,
} from 'mongoose';
import { IModel } from '../types/model';
import { IGroupDocument } from './group';
import { UserRoles } from '../lib/constants';

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
  legacyId: string;
  integration: IUserIntegrations;
}

export interface IUserDocument extends IUser, Document {
  _id: string;
}
export type IUserModel = IModel<IUser>;

const userSchema = new Schema({
  // TODO: update this to ObjectId
  _id: { type: String },
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  password: { type: String, required: true },
  plaidItems: { type: [String], ref: 'plaidItem', default: [] },
  dateJoined: { type: Date, default: new Date() },
  zipcode: { type: String },
  subscribedUpdates: { type: Boolean, default: true },
  groups: [{
    group: {
      type: Schema.Types.ObjectId,
      ref: 'user_group',
    },
    role: { type: String },
  }],
  role: {
    type: String,
    default: 'none',
    enum: Object.values(UserRoles),
  },
  emailVerified: { type: Boolean, default: false },
  lastModified: { type: Date, default: new Date() },
  legacyId: { type: String },
  integrations: {
    rare: {
      type: {
        userId: { type: String },
      },
    },
  },
});

export const UserModel = model<IUserDocument, Model<IUser>>('user', userSchema);
