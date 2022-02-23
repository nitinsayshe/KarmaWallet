import {
  Schema,
  model,
  Document,
  Model,
} from 'mongoose';
import { IModel } from '../types/model';

export interface IMisc {
  key: string;
  value: string;
}

export interface IMiscDocument extends IMisc, Document {}
export type IMistModel = IModel<IMisc>;

const miscSchema = new Schema({
  key: { type: String },
  value: { type: String },
});

export const MiscModel = model<IMiscDocument, Model<IMisc>>('misc', miscSchema);
