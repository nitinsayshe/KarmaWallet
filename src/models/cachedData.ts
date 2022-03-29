import {
  Schema,
  model,
  Document,
  Model,
} from 'mongoose';
import { IModel } from '../types/model';

export interface ICachedData {
  key: string;
  value: any;
  lastUpdated: Date;
  ttl: Date;
}

export interface ICachedDataDocument extends ICachedData, Document {}
export type ICachedDataModel = IModel<ICachedData>;

const cachedDataSchema = new Schema({
  key: { type: String },
  lastUpdated: { type: Date },
  ttl: { type: Date },
  value: { type: Schema.Types.Mixed },
});

export const CachedDataModel = model<ICachedDataDocument, Model<ICachedData>>('cachedData', cachedDataSchema);
