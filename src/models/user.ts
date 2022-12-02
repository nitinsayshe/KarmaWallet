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

export interface IActiveCampaignUserIntegration {
  userId: string;
  latestSync: Date;
}

export interface IPaypalUserIntegration {
  user_id: string,
  sub: string,
  name: string,
  middle_name: string,
  email: string,
  verified: Boolean,
  payerId: string,
  verified_account: Boolean,
  email_verified: Boolean,
}

export interface IUserIntegrations {
  rare?: IRareUserIntegration;
  paypal?: IRareUserIntegration;
  activecampaign?: IActiveCampaignUserIntegration;
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
    paypal: {
      type: {
        payerId: { type: String },
        email: { type: String },
        user_id: { type: String },
        sub: { type: String },
        name: { type: String },
        middle_name: { type: String },
        verified: { type: Boolean },
        verified_account: { type: Boolean },
        email_verified: { type: Boolean },
      },
    },
    activecampaign: {
      type: {
        latestSyncDate: { type: Date },
      },
    },
  },
});
userSchema.plugin(mongoosePaginate);

export const UserModel = model<IUserDocument, PaginateModel<IUser>>('user', userSchema);
