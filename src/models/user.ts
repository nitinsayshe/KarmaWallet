import {
  Schema,
  model,
  Document,
  PaginateModel,
  ObjectId,
} from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
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

export interface IUserDocument extends IUser, Document {}
export type IUserModel = IModel<IUser>;

const userSchema = new Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  password: { type: String, required: true },
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
  legacyId: { type: String },
  integrations: {
    rare: {
      type: {
        userId: { type: String },
      },
    },
  },
});
userSchema.plugin(mongoosePaginate);

export const UserModel = model<IUserDocument, PaginateModel<IUser>>('user', userSchema);
