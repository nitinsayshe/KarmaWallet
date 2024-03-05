import {
  Schema,
  model,
  Document,
  Model,
} from 'mongoose';
import { getUtcDate } from '../lib/date';
import { IModel } from '../types/model';

export enum WebhookProviders {
  Marqeta = 'marqeta',
  Wildfire = 'wildfire',
  Rare = 'rare',
  Kard = 'kard',
  Plaid = 'plaid',
}

export interface IWebhook {
  provider: WebhookProviders;
  createdOn: Date;
  body: any;
}

export interface IWebhookDocument extends IWebhook, Document {}
export type IWebhookModel = IModel<IWebhook>;

const webhookSchema = new Schema({
  provider: { type: String, enum: Object.values(WebhookProviders), required: true },
  createdOn: { type: Date, default: () => getUtcDate().toDate() },
  body: { type: Object },
});

export const WebhookModel = model<IWebhookDocument, Model<IWebhook>>('webhook', webhookSchema);
