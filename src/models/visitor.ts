import {
  Document, model, ObjectId, PaginateModel, Schema,
} from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { getUtcDate } from '../lib/date';
import { IModel, IRef } from '../types/model';
import { IShareableUser, IUser, IUrlParam, UserEmailStatus } from './user';

export interface IVisitorIntegrations {
  groupCode?: string;
  params?: IUrlParam[];
  shareASale?: boolean;
}

export interface IShareableVisitor {
  email: string;
  emailStatus: UserEmailStatus;
  integrations?: IVisitorIntegrations;
  statusLastModified: Date;
  createdOn: Date;
}

export interface IVisitor extends IShareableVisitor {
  user?: IRef<ObjectId, (IShareableUser | IUser)>;
}

export interface IVisitorDocument extends IVisitor, Document {}
export type IVisitorModel = IModel<IVisitor>;

const visitorSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'user',
  },
  email: {
    type: String,
    required: true,
  },
  emailStatus: {
    type: String,
    enum: Object.values(UserEmailStatus),
    default: UserEmailStatus.Unverified,
    required: true,
  },
  statusLastModified: {
    type: Date,
    default: () => getUtcDate(),
    required: true,
  },
  integrations: {
    groupCode: String,
    params: { type: Array },
    shareASale: Boolean,
  },
  createdOn: { type: Date, default: () => getUtcDate() },
});

visitorSchema.plugin(mongoosePaginate);
export const VisitorModel = model<IVisitorDocument, PaginateModel<IVisitor>>('visitor', visitorSchema);
