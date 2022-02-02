import {
  Schema,
  model,
  Document,
  Model,
} from 'mongoose';
import { UserRoles } from '../lib/constants';
import { IModel, IRef } from '../types/model';
import { IPlaidItemDocument } from './plaidItem';
import { IUserGroup, IUserIntegrations } from './user';

export interface ILegacyUser {
  _id: string;
  email: string;
  name: string;
  password: string;
  plaidItems: IRef<string, IPlaidItemDocument>;
  transactions: object; // ??? what is this?
  dateJoined: Date;
  zipcode: string;
  subscribedUpdates: boolean;
  groups: IUserGroup[];
  role: string;
  integration: IUserIntegrations;
}

export interface ILegacyUserDocument extends ILegacyUser, Document {
  _id: string;
}
export type ILegacyUserModel = IModel<ILegacyUser>;

const legacyUserSchema = new Schema({
  _id: { type: String, required: true },
  email: { type: String, required: true },
  name: { type: String, required: true },
  password: { type: String, required: true },
  plaidItems: { type: [String], ref: 'plaidItem', default: [] },
  transactions: { type: Object, default: {} },
  dateJoined: { type: Date, default: () => Date.now() },
  zipcode: { type: String },
  subscribedUpdates: { type: Boolean, default: true },
  groups: [{
    id: {
      type: Schema.Types.ObjectId,
      ref: 'group',
    },
    role: { type: String },
  }],
  role: {
    type: String,
    default: 'none',
    enum: Object.values(UserRoles),
  },
  integrations: {
    rare: {
      userId: { type: String },
    },
  },
});

export const LegacyUserModel = model<ILegacyUserDocument, Model<ILegacyUser>>('legacy_user', legacyUserSchema);
