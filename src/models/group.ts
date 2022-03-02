import {
  Schema,
  model,
  Document,
  Model,
} from 'mongoose';
import { IModel, IRef } from '../types/model';
import { IShareableUser, IUser } from './user';

export enum GroupPrivacyStatus {
  Protected = 'protected',
  Public = 'public',
  Private = 'private'
}

export interface IGroupIntegrations {
  integrations: {
    rare: {
      type: {
        groupId: string,
      },
    },
  },
}

export interface IGroupMatching {
  enabled: Boolean,
  matchPercentage: Number;
  maxDollarAmount: Number;
  lastModified: Date;
}

export interface IGroupSettings {
  privacyStatus: GroupPrivacyStatus;
  allowInvite: Boolean;
  allowDomainRestriction: Boolean;
  allowSubgroups: Boolean;
  approvalRequired: Boolean;
  matching: IGroupMatching;
}

export interface IShareableGroup {
  name: string;
  code: string;
  domains: string[];
  settings: IGroupSettings;
  owner: IRef<Schema.Types.ObjectId, (IShareableUser | IUser)>;
  createdOn: Date;
  lastModified: Date;
}

export interface IGroup extends IShareableGroup {
  integrations: IGroupIntegrations;
  domains: string[];
  invites: string[];
  logo: string;
  company: string,
}

export interface IGroupDocument extends IGroup, Document {}
export type IGroupModel = IModel<IGroup>;

const groupSchema = new Schema({
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'user',
  },
  integrations: {
    rare: {
      type: {
        groupId: { type: String },
      },
    },
  },
  createdOn: {
    type: Date,
    default: new Date(),
  },
  lastModified: {
    type: Date,
    default: new Date(),
  },
  settings: {
    privacyStatus: {
      type: String,
      enum: Object.values(GroupPrivacyStatus),
      default: GroupPrivacyStatus.Private,
    },
    allowInvite: { type: Boolean },
    allowDomainRestriction: { type: Boolean },
    allowSubgroups: { type: Boolean },
    approvalRequired: { type: Boolean },
    matching: {
      enabled: { type: Boolean },
      matchPercentage: { type: Number },
      maxDollarAmount: { type: Number },
      lastModified: {
        type: Date,
        default: new Date(),
      },
    },
  },
  domains: [{ type: String }],
  invites: [{ type: String }],
  name: { type: String },
  code: {
    type: String,
    unique: true,
  },
  logo: { type: String },
  company: {
    type: Schema.Types.ObjectId,
    ref: 'company',
  },
});

export const GroupModel = model<IGroupDocument, Model<IGroup>>('group', groupSchema);
