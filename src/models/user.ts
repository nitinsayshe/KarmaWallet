import { Schema, model, Document, PaginateModel, ObjectId } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { IModel, IRef } from '../types/model';
import { UserRoles } from '../lib/constants';
import { getUtcDate } from '../lib/date';
import { IPromo, IPromoDocument } from './promo';
import { IArticle } from './article';

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
  bouncedDate?: Date;
}

export interface IRareUserIntegration {
  userId?: string;
}

export interface IShareASale {
  trackingId?: string;
}

export interface IActiveCampaignUserIntegration {
  userId: string;
  latestSync: Date;
}

export interface IKardIntegration {
  userId: string;
  dateAccountCreated: Date;
  dateAccountUpdated?: Date;
}

export interface IUrlParam {
  key: string;
  value: string;
}

export interface IPaypalUserIntegration {
  user_id: string;
  sub: string;
  name: string;
  middle_name: string;
  email: string;
  verified: Boolean;
  payerId: string;
  verified_account: Boolean;
  email_verified: Boolean;
}

export interface IReferrals {
  params: IUrlParam[];
}

export interface IBiometrics {
  _id?:string;
  biometricKey: string,
  isBiometricEnabled: Boolean,
}

export interface IUserIntegrations {
  rare?: IRareUserIntegration;
  paypal?: IPaypalUserIntegration;
  activecampaign?: IActiveCampaignUserIntegration;
  kard?: IKardIntegration;
  shareasale?: IShareASale;
  referrals?: IReferrals;
  promos?: IRef<ObjectId, IPromo | IPromoDocument>[];
  biometrics?: IBiometrics[];
}

export interface IShareableUser {
  email: string;
  name: string;
  dateJoined: Date;
  zipcode: string;
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
  articles?: {
    queued?: {
      date: Date;
      article: IRef<ObjectId, IArticle>;
    }[];
  };
}

export interface IUserDocument extends IUser, Document {}
export type IUserModel = IModel<IUser>;

const userSchema = new Schema({
  emails: [
    {
      type: {
        email: { type: String },
        status: {
          type: String,
          enum: Object.values(UserEmailStatus),
          default: UserEmailStatus.Verified,
        },
        bouncedDate: { type: Date },
        primary: { type: Boolean, default: false },
      },
    },
  ],
  name: { type: String, required: true },
  password: { type: String, required: true },
  dateJoined: { type: Date, default: () => getUtcDate() },
  zipcode: { type: String },
  role: {
    type: String,
    default: 'none',
    enum: Object.values(UserRoles),
  },
  lastModified: { type: Date, default: () => getUtcDate() },
  legacyId: { type: String },
  articles: {
    type: {
      queued: [
        {
          type: {
            date: { type: Date, required: true },
            article: { type: Schema.Types.ObjectId, ref: 'article', required: true },
          },
        },
      ],
    },
  },
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
    kard: {
      type: {
        userId: { type: String },
        dateAccountCreated: { type: Date },
        dateAccountUpdated: { type: Date },
      },
    },
    shareasale: {
      type: {
        trackingId: { type: String },
      },
    },
    referrals: {
      type: {
        params: { type: Array },
      },
    },
    promos: {
      type: [{ type: Schema.Types.ObjectId, ref: 'promo' }],
    },
    biometrics: [
      {
        type: {
          biometricKey: { type: String },
          isBiometricEnabled: { type: Boolean },
        },
      },
    ],
  },
});
userSchema.plugin(mongoosePaginate);

export const UserModel = model<IUserDocument, PaginateModel<IUser>>('user', userSchema);
