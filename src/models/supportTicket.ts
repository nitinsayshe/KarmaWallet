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

export enum ISupportTicketStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  RESOLVED = 'resolved',
}

export interface ISupportTicket {
  _id: ObjectId;
  createdOn: Date;
  user: IRef<ObjectId, IShareableUser>;
  status: ISupportTicketStatus;
}

export interface ISupportTicketDocument extends ISupportTicket, Document {
  _id: ObjectId;
}

export type ISupportTicketModel = IModel<ISupportTicket>;

const supportTicketSchema = new Schema({
  createdOn: { type: Date, default: () => getUtcDate().toDate() },
  lastModified: { type: Date, default: () => getUtcDate().toDate() },
  user: { type: Schema.Types.ObjectId, ref: 'user' },
  status: { type: String, enum: Object.values(ISupportTicketStatus), default: ISupportTicketStatus.OPEN },
  message: { type: String },
});

export const SupportTicketModel = model<ISupportTicketDocument, Model<ISupportTicket>>('support_ticket', supportTicketSchema);
