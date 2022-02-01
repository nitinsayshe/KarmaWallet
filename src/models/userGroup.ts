import {
  Schema,
  model,
  Document,
  Model,
  ObjectId,
} from 'mongoose';
import { IModel, IRef } from '../types/model';
import { IGroup } from './group';

export enum UserGroupRole {
  Member = 'member',
  Admin = 'admin',
}

export interface IUserGroup {
  group: IRef<ObjectId, IGroup>;
  role: UserGroupRole;
}

export interface IUserGroupDocument extends IUserGroup, Document {}
export type IUserGroupModel = IModel<IUserGroup>;

const userGroupSchema = new Schema({
  group: {
    type: Schema.Types.ObjectId,
    ref: 'group',
  },
  role: {
    type: String,
    enum: Object.values(UserGroupRole),
    default: UserGroupRole.Member,
  },
});

export const UserGroupModel = model<IUserGroupDocument, Model<IUserGroup>>('user_group', userGroupSchema);
