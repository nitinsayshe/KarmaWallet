import { ObjectId,
  Schema,
  model,
  Document,
  Model,
} from 'mongoose';
import { IModel, IRef } from '../types/model';
import { IUserDocument } from './user';

// values for EmailTemplates should map to the directory names in /src/templates/email/
export enum EmailTemplates {
  GroupVerification = 'groupVerification',
  EmailVerification = 'emailVerification',
  Welcome = 'welcome'
}

export interface ISentEmail {
  key: EmailTemplates;
  email: string;
  user: IRef<ObjectId, IUserDocument>;
  sentAt: Date;
}

export interface ISentEmailDocument extends ISentEmail, Document {}
export type ISentEmailModel = IModel<ISentEmail>;

const sentEmailSchema = new Schema({
  key: { type: String, enum: Object.values(EmailTemplates), required: true },
  email: { type: String },
  user: { type: Schema.Types.ObjectId, ref: 'user', required: true },
  sentAt: { type: Date },
});

export const SentEmailModel = model<ISentEmailDocument, Model<ISentEmail>>('sent_email', sentEmailSchema);
