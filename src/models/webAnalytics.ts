import {
  Schema,
  model,
  Document,
  Model,
  ObjectId,
} from 'mongoose';
import { getUtcDate } from '../lib/date';
import { IModel } from '../types/model';

export interface IAnalytic {
  _id: ObjectId;
  createdOn: Date;
  lastModifiedOn: Date;
  name: string;
  location: string;
  subLocation: string;
  description: string;
}

export interface IAnalyticDocument extends IAnalytic, Document {
  _id: ObjectId;
}

export type IWebAnalyticsModel = IModel<IAnalytic>;

const webAnalyticsSchema = new Schema({
  createdOn: { type: Date, required: true, default: () => getUtcDate() },
  lastModifiedOn: { type: Date, required: true, default: () => getUtcDate() },
  name: { type: String, required: true },
  location: { type: String, required: true },
  subLocation: { type: String, required: true },
  description: { type: String, required: true },
});

export const WebAnalyticsModel = model<IAnalyticDocument, Model<IAnalytic>>('web_analytics', webAnalyticsSchema);
