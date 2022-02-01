import {
  Schema,
  model,
  Document,
  Model,
} from 'mongoose';
import { IModel } from '../types/model';

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
  integrations: IDataSourceIntegrations;
}

export interface IDataSourceDocument extends IDataSource, Document {}
export type IDataSourceModel = IModel<IDataSource>;

const dataSourceSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
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
});

export const DataSourceModel = model<IDataSourceDocument, Model<IDataSource>>('data_source', dataSourceSchema);
