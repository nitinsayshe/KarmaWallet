import { Schema, model, Document, PaginateModel } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { getUtcDate } from '../lib/date';
import { IModel } from '../types/model';
import { ApiKeyStatus } from '../lib/constants/index';
import { IApp } from './app';

export interface IApiKey {
  keyHash: string;
  status: ApiKeyStatus;
  app: IApp;
  createdOn: Date;
  lastModified: Date;
  expires: Date;
  deletedOn?: Date;
}

export type IApiKeyModel = IModel<IApiKey>;

export interface IApiKeyDocument extends IApiKey, Document {}

const apiKeySchema = new Schema({
  keyHash: { type: String, required: true },
  app: { type: Schema.Types.ObjectId, ref: 'app', required: true },
  status: {
    type: String,
    required: true,
    enum: Object.values(ApiKeyStatus),
  },
  createdOn: { type: Date, default: () => getUtcDate().toDate() },
  lastModified: { type: Date, default: () => getUtcDate().toDate() },
  expires: { type: Date, default: () => getUtcDate().add(1, 'year').toDate() },
  deletedOn: { type: Date },
});

apiKeySchema.plugin(mongoosePaginate);

export const ApiKeyModel = model<IApiKeyDocument, PaginateModel<IApiKey>>(
  'apiKey',
  apiKeySchema,
);
