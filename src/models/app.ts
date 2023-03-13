import { Schema, model, Document, PaginateModel } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { v4 as uuid } from 'uuid';
import { getUtcDate } from '../lib/date';
import { IModel } from '../types/model';
import { IClient } from './client';

export interface IAppDataAccess {
  carbonEmissins: boolean;
}

export interface IAppSettings {
  url?: string;
  ip?: string;
  dataAccess?: IAppDataAccess[];
}

export interface IApp {
  apiId: string;
  name: string;
  client: IClient;
  settings: IAppSettings;
  createdOn: Date;
  lastModified: Date;
  deletedOn?: Date;
}

export interface IShareableApp {
  apiId: string;
  name: string;
}

export type IAppModel = IModel<IApp>;

export interface IAppDocument extends IApp, Document {}

const settings = {
  type: {
    url: { type: String },
    ip: { type: String },
    dataAccess: [
      {
        type: {
          carbonEmissins: { type: Boolean },
        },
      },
    ],
  },
};

const appSchema = new Schema({
  settings,
  apiId: { type: String, default: () => uuid().toString() },
  name: { type: String, required: true },
  client: { type: Schema.Types.ObjectId, ref: 'client', required: true },
  createdOn: { type: Date, default: () => getUtcDate().toDate() },
  lastModified: { type: Date, default: () => getUtcDate().toDate() },
  deletedOn: { type: Date },

});

appSchema.plugin(mongoosePaginate);

export const AppModel = model<IAppDocument, PaginateModel<IApp>>(
  'app',
  appSchema,
);
