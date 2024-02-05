import {
  Schema,
  model,
  Document,
  Model,
} from 'mongoose';
import { IModel } from '../types/model';

export interface IWebAnalyticsLocation {
  key: string;
  value: string;
}

export interface IWebAnalyticsLocationDocument extends IWebAnalyticsLocation, Document {}
export type IWebAnalyticsLocationModel = IModel<IWebAnalyticsLocation>;

const webAnalyticsLocationSchema = new Schema({
  key: { type: String },
  value: { type: String },
});

export const WebAnalyticsLocationModel = model<IWebAnalyticsLocationDocument, Model<IWebAnalyticsLocation>>('web-analytics-location', webAnalyticsLocationSchema);
