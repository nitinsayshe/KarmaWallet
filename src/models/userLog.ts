import {
  Schema,
  model,
  Document,
  PaginateModel,
  ObjectId,
} from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { IModel, IRef } from '../types/model';
import { IShareableUser, IUser } from './user';

export interface IUserLog {
  user: IRef<ObjectId, (IShareableUser | IUser)>;
  date: Date;
}

export interface IUserLogDocument extends IUserLog, Document {}
export type IUserLogModel = IModel<IUserLog>;

const userLogSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  date: {
    type: Date,
  },
});
userLogSchema.plugin(mongoosePaginate);

export const UserLogModel = model<IUserLogDocument, PaginateModel<IUserLog>>('user_log', userLogSchema);
