import {
  Schema,
  model,
  Document,
  PaginateModel,
} from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { UserGroupStatus } from '../types/groups';
import { IModel, IRef } from '../types/model';
import { IShareableUser } from './user';
import { getUtcDate } from '../lib/date';

export enum GroupPrivacyStatus {
  Protected = 'protected',
  Public = 'public',
  Private = 'private'
}

export enum GroupStatus {
  Open = 'open',
  Locked = 'locked',
  Deleted = 'deleted',
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
  enabled: boolean,
  matchPercentage: number;
  maxDollarAmount: number;
  lastModified: Date;
}

export interface IGroupSettings {
  privacyStatus: GroupPrivacyStatus;
  allowInvite: boolean;
  allowDomainRestriction: boolean;
  allowSubgroups: boolean;
  approvalRequired: boolean;
  matching: IGroupMatching;
}

export interface IShareableOwner {
  _id: string;
  name: string;
}

export interface IShareableGroup {
  name: string;
  code: string;
  domains: string[];
  logo: string;
  settings: IGroupSettings;
  owner: IRef<Schema.Types.ObjectId, (IShareableOwner | IShareableUser)>;
  status: GroupStatus;
  totalMembers: number;
  createdOn: Date;
  lastModified: Date;
}

export interface IGroup extends IShareableGroup {
  integrations: IGroupIntegrations;
  domains: string[];
  invites: string[];
  logo: string;
  company: string;
  members: Schema.Types.ObjectId[]
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
    default: () => getUtcDate(),
  },
  lastModified: {
    type: Date,
    default: () => getUtcDate(),
  },
  settings: {
    type: {
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
        type: {
          enabled: { type: Boolean },
          matchPercentage: { type: Number },
          maxDollarAmount: { type: Number },
          lastModified: {
            type: Date,
            default: () => getUtcDate(),
          },
        },
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
  status: {
    type: String,
    enum: Object.values(GroupStatus),
    default: GroupStatus.Open,
  },
});
groupSchema.plugin(mongoosePaginate);

groupSchema.virtual('members', {
  ref: 'UserGroup',
  localField: '_id',
  foreignField: 'group',
  justOne: false,
  match: { status: { $nin: [UserGroupStatus.Banned, UserGroupStatus.Left, UserGroupStatus.Removed] } },
});

export const GroupModel = model<IGroupDocument, PaginateModel<IGroup>>('group', groupSchema);
