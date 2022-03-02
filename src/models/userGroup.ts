import {
  Schema,
  model,
  Document,
  Model,
  ObjectId,
} from 'mongoose';
import { IModel, IRef } from '../types/model';
import { IGroup, IShareableGroup } from './group';
import { ISubgroup } from './subgroup';
import { IShareableUser, IUser } from './user';

export enum UserGroupRole {
  Member = 'member',
  Admin = 'admin',
}

export enum UserGroupStatus {
  Unverified = 'unverified',
  Verified = 'unverified',
  Approved = 'approved',
  Removed = 'removed',
  Banned = 'banned',
}

export interface IShareableUserGroup {
  user: IRef<ObjectId, (IShareableUser | IUser)>;
  group: IRef<ObjectId, (IShareableGroup | IGroup)>;
  email: string;
  role: UserGroupRole;
  status: UserGroupStatus;
  joinedOn: Date;
  subGroups?: IRef<ObjectId, ISubgroup>[];
}

export interface IUserGroup extends IShareableUserGroup {
  lastModified: Date;
}

export interface IUserGroupDocument extends IUserGroup, Document {}
export type IUserGroupModel = IModel<IUserGroup>;

const userGroupSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'user',
  },
  group: {
    type: Schema.Types.ObjectId,
    ref: 'group',
  },
  email: { type: String },
  role: {
    type: String,
    enum: Object.values(UserGroupRole),
    default: UserGroupRole.Member,
  },
  status: {
    type: String,
    enum: Object.values(UserGroupStatus),
    default: UserGroupStatus.Unverified,
  },
  joinedOn: {
    type: Date,
    default: new Date(),
  },
  lastModified: {
    type: Date,
    default: new Date(),
  },
  subgroups: [{
    type: Schema.Types.ObjectId,
    ref: 'subgroup',
  }],
});

export const UserGroupModel = model<IUserGroupDocument, Model<IUserGroup>>('user_group', userGroupSchema);
