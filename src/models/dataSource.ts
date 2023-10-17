import {
  Schema,
  model,
  Document,
  Model,
  ObjectId,
} from 'mongoose';
import { IModel, IRef } from '../types/model';

export interface IJustCapitalDataSourceIntegrations {
  dummyPlaceholder: string;
}

export interface IBCorpDataSourceIntegrations {
  dummyPlaceholder: string;
}

export interface IDataSourceIntegrations {
  justCapital: IJustCapitalDataSourceIntegrations;
  bCorp: IBCorpDataSourceIntegrations
}

export interface IDataSource {
  name: string;
  url: string;
  notes?: string;
  integrations?: IDataSourceIntegrations;
  createdAt: Date;
  lastModified: Date;
  logoUrl?: string;
  rank?: number;
  description?: string;
  hidden: boolean;
  parentSource?: IRef<ObjectId, IDataSource>;
}

export interface IDataSourceDocument extends IDataSource, Document {}
export type IDataSourceModel = IModel<IDataSource>;

const dataSourceSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  url: { type: String },
  logoUrl: { type: String },
  description: { type: String },
  notes: { type: String },
  rank: { type: Number },
  hidden: { type: Boolean },
  integrations: {
    type: {
      justCapital: {
        dummyPlaceholder: { type: String },
      },
      bCorp: {
        dummyPlaceholder: { type: String },
      },
    },
  },
  createdAt: { type: Date },
  lastModified: { type: Date },
  parentSource: { type: Schema.Types.ObjectId, ref: 'data_source' },
});

export const DataSourceModel = model<IDataSourceDocument, Model<IDataSource>>('data_source', dataSourceSchema);
