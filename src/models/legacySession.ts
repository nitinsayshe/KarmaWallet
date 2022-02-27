import {
  Schema,
  model,
  Document,
  Model,
} from 'mongoose';
import { IModel } from '../types/model';

export interface ILegacySession {
  _id: string;
  uid: string;
  authKey: string;
  sessionTime: Date;
  expiration: Date;
}

export interface ILegacySessionDocument extends ILegacySession, Document {
  _id: string;
}
export type ILegacySessionModel = IModel<ILegacySession>;

const legacySessionSchema = new Schema({
  _id: { type: String, required: true },
  uid: { type: String, required: true },
  authKey: { type: String, required: true },
  sessionTime: { type: Date, default: () => Date.now() },
  expiration: { type: Date, default: () => Date.now() + (86400000 * 30) },
});

export const LegacySessionModel = model<ILegacySessionDocument, Model<ILegacySession>>('session', legacySessionSchema);
