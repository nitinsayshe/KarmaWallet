import { ObjectId,
  Schema,
  model,
  Document,
  Model,
} from 'mongoose';
import { EmailTemplateKeys } from '../lib/constants/email';
import { IModel, IRef } from '../types/model';
import { IUserDocument } from './user';
import { IVisitorDocument } from './visitor';

export interface ISentEmail {
  key: EmailTemplateKeys;
  email: string;
  user?: IRef<ObjectId, IUserDocument>;
  visitor?: IRef<ObjectId, IVisitorDocument>;
  sentAt: Date;
}

export interface ISentEmailDocument extends ISentEmail, Document {}
export type ISentEmailModel = IModel<ISentEmail>;

const sentEmailSchema = new Schema({
  key: { type: String, enum: Object.values(EmailTemplateKeys), required: true },
  email: { type: String },
  user: { type: Schema.Types.ObjectId, ref: 'user' },
  visitor: { type: Schema.Types.ObjectId, ref: 'visitor' },
  sentAt: { type: Date },
});

export const SentEmailModel = model<ISentEmailDocument, Model<ISentEmail>>('sent_email', sentEmailSchema);
