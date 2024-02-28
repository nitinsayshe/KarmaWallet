import {
  Schema,
  model,
  Document,
  PaginateModel,
  ObjectId,
} from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { getUtcDate } from '../lib/date';
import { IModel, IRef } from '../types/model';
import { IShareableUser, IUser } from './user/types';

export interface IUserLog {
  user: IRef<ObjectId, (IShareableUser | IUser)>;
  date: Date;
  authKey: string;
}

export interface IUserLogDocument extends IUserLog, Document {}
export type IUserLogModel = IModel<IUserLog>;

const userLogSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  date: { type: Date, default: () => getUtcDate() },
  authKey: { type: String },
});
userLogSchema.plugin(mongoosePaginate);

export const UserLogModel = model<IUserLogDocument, PaginateModel<IUserLog>>('user_log', userLogSchema);
