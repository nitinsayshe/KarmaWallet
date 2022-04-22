import {
  Schema,
  model,
  Document,
  PaginateModel,
} from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { IModel } from '../types/model';
import { UserRoles } from '../lib/constants';

export enum UserEmailStatus {
  Unverified = 'unverified',
  Verified = 'verified',
  Bounced = 'bounced',
  Complained = 'complained',
}

// TODO: remove alt emails after mapping
export interface IAltEmail {
  email: string;
  status: UserEmailStatus;
}

export interface IEmail {
  email: string;
  status: UserEmailStatus;
  primary: boolean;
}

export interface IRareUserIntegration {
  userId?: string;
}

export interface IUserIntegrations {
  rare?: IRareUserIntegration;
}

export interface IShareableUser {
  email: string;
  name: string;
  dateJoined: Date;
  zipcode: string;
  subscribedUpdates: boolean;
  role: string; // cannot mark as UserRoles due to how mongoose treats enums
  legacyId: string;
}

export interface IUser extends IShareableUser {
  emails: IEmail[];
  // TODO: remove alt emails after mapping
  altEmails: IAltEmail[];
  password: string;
  lastModified: Date;
  integrations?: IUserIntegrations;
}

export interface IUserDocument extends IUser, Document {}
export type IUserModel = IModel<IUser>;

const userSchema = new Schema({
  email: { type: String, required: true, unique: true },
  emails: [{
    type: {
      email: { type: String },
      status: {
        type: String,
        enum: Object.values(UserEmailStatus),
        default: UserEmailStatus.Unverified,
      },
      primary: { type: Boolean, default: false },
    },
  }],
  name: { type: String, required: true },
  password: { type: String, required: true },
  dateJoined: { type: Date, default: new Date() },
  zipcode: { type: String },
  subscribedUpdates: { type: Boolean, default: true },
  role: {
    type: String,
    default: 'none',
    enum: Object.values(UserRoles),
  },
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
