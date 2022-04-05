import {
  Schema,
  model,
  Document,
  PaginateModel,
  ObjectId,
} from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { UserGroupRole } from '../lib/constants';
import { UserGroupStatus } from '../types/groups';
import { IModel, IRef } from '../types/model';
import { IGroup, IShareableGroup } from './group';
import { ISubgroup } from './subgroup';
import { IShareableUser, IUser } from './user';

export interface IShareableGroupMember {
  name: string;
  email: string;
  role: UserGroupRole;
  status: UserGroupStatus;
  joinedOn: Date;
}

export interface IShareableUserGroup {
  group: IRef<ObjectId, (IShareableGroup | IGroup)>;
  email: string;
  role: UserGroupRole;
  status: UserGroupStatus;
  joinedOn: Date;
  subGroups?: IRef<ObjectId, ISubgroup>[];
}

export interface IUserGroup extends IShareableUserGroup {
  user: IRef<ObjectId, (IShareableUser | IUser)>;
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
userGroupSchema.plugin(mongoosePaginate);

export const UserGroupModel = model<IUserGroupDocument, PaginateModel<IUserGroup>>('user_group', userGroupSchema);
