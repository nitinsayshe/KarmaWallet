import { Document, model, PaginateModel, Schema } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { UserRoles } from '../../lib/constants';
import { getUtcDate } from '../../lib/date';
import { IModel } from '../../types/model';
import { ComplyAdvantageIntegrationSchema } from '../types';
import { IUser, UserEmailStatus } from './types';

export interface IUserDocument extends IUser, Document { }
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
  isTestIdentity: { type: Boolean },
  isAutoGeneratedPassword: { type: Boolean },
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
            article: { type: Schema.Types.ObjectId, ref: 'wp_article', required: true },
          },
        },
      ],
    },
  },
  integrations: {
    marqeta: {
      type: {
        userToken: { type: String },
        email: { type: String },
        kycResult: {
          status: { type: String },
          codes: { type: Array },
        },
        first_name: { type: String },
        last_name: { type: String },
        birth_date: { type: String },
        phone: { type: String },
        address1: { type: String },
        address2: { type: String },
        city: { type: String },
        state: { type: String },
        country: { type: String },
        postal_code: { type: String },
        reason: { type: String },
        reason_code: { type: String },
        account_holder_group_token: { type: String },
        identifications: [
          {
            type: { type: String },
            value: { type: String },
          },
        ],
        status: { type: String },
        created_time: { type: String },
      },
    },
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
    shareasale: {
      type: {
        trackingId: { type: String },
        xTypeParam: { type: String },
        sscid: { type: String },
        sscidCreatedOn: { type: String },
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
          dateKeyCreated: { type: Date, default: () => getUtcDate() },
        },
      },
    ],
    fcm: [{ token: String, deviceId: String }],
    complyAdvantage: ComplyAdvantageIntegrationSchema,
  },
  deviceInfo: [{
    manufacturer: { type: String },
    bundleId: { type: String },
    deviceId: { type: String },
    apiLevel: { type: String },
    applicaitonName: { type: String },
    model: { type: String },
    buildNumber: { type: String },
  }],
});
userSchema.plugin(mongoosePaginate);

export const UserModel = model<IUserDocument, PaginateModel<IUser>>('user', userSchema);
