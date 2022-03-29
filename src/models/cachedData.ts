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
  key: { type: String, required: true },
  lastUpdated: { type: Date, required: true },
  ttl: { type: Date, required: true },
  value: { type: Schema.Types.Mixed, required: true },
});

export const CachedDataModel = model<ICachedDataDocument, Model<ICachedData>>('cachedData', cachedDataSchema);
