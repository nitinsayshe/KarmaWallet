import {
  Schema,
  model,
  Document,
  Model,
  ObjectId,
} from 'mongoose';
import { IModel, IRef } from '../types/model';
import { IShareableUser } from './user/types';
import { getUtcDate } from '../lib/date';
import { IShareableVisitor } from './visitor/types';

export interface IContactUs {
  _id: ObjectId;
  createdOn: Date;
  user?: IRef<ObjectId, IShareableUser>;
  visitor?: IRef<ObjectId, IShareableVisitor>;
  message: string;
  topic: string;
  email: string;
  emailSentTo: string;
  phone?: string;
  userName: string;
}

export interface IContactUsDocument extends IContactUs, Document {
  _id: ObjectId;
}

export type IContactUsModel = IModel<IContactUs>;

const contactUsSchema = new Schema({
  createdOn: { type: Date, default: () => getUtcDate().toDate() },
  user: { type: Schema.Types.ObjectId, ref: 'user' },
  visitor: { type: Schema.Types.ObjectId, ref: 'visitor' },
  message: { type: String, required: true },
  topic: { type: String, required: true },
  email: { type: String, required: true },
  emailSentTo: { type: String, required: true },
  phone: { type: String },
  userName: { type: String, required: true },
});

export const ContactUsModel = model<IContactUsDocument, Model<IContactUs>>('contact_us', contactUsSchema);
