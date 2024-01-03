import {
  Schema,
  model,
  Document,
  Model,
  ObjectId,
} from 'mongoose';
import { getUtcDate } from '../lib/date';
import { IModel } from '../types/model';

enum AnalyticLocation {
  HomePage = 'home_page',
  AboutPage = 'about_page',
  ContactPage = 'contact_page',
}

export interface IAnalytic {
  _id: ObjectId;
  createdOn: Date;
  lastModified: Date;
  enabled: boolean;
  name: string;
  location: Location;
  description: string;
}

export interface IAnalyticDocument extends IAnalytic, Document {
  _id: ObjectId;
}

export type IWebAnalyticsModel = IModel<IAnalytic>;

const webAnalyticsSchema = new Schema({
  createdOn: { type: Date, required: true, default: () => getUtcDate() },
  lastModified: { type: Date, required: true, default: () => getUtcDate() },
  name: { type: String, required: true },
  location: { type: String, enum: Object.values(AnalyticLocation), required: true },
  description: { type: String, required: true },
});

export const WebAnalyticsModel = model<IAnalyticDocument, Model<IAnalytic>>('web_analytics', webAnalyticsSchema);
