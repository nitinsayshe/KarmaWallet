import {
  Schema,
  model,
  Document,
  Model,
  ObjectId,
} from 'mongoose';
import { IModel, IRef } from '../types/model';
import { IDataSourceDocument } from './dataSource';
import { IUnsdgDocument } from './unsdg';
import { IUnsdgTargetDocument } from './unsdgTarget';

export interface IUnsdgTargetMapItem {
  target: IRef<ObjectId, IUnsdgTargetDocument>;
  value: number;
  exists: boolean; // means exists or does not from the source
}

export interface IUnsdgMapItem {
  unsdg: IRef<ObjectId, IUnsdgDocument>,
  value: number;
  exists: boolean; // means exists or does not from the source
  targets: IUnsdgTargetMapItem[];
}

export interface IDataSourceMapping {
  source: IRef<Object, IDataSourceDocument>;
  unsdgs: IUnsdgMapItem[];
}

export interface IDataSourceMappingDocument extends IDataSourceMapping, Document {}
export type IDataSourceMappingModel = IModel<IDataSourceMapping>;

const dataSourceMappingSchema = new Schema({
  source: {
    type: Schema.Types.ObjectId,
    ref: 'data_source',
  },
  unsdgs: [{
    unsdg: {
      type: Schema.Types.ObjectId,
      ref: 'unsdg',
    },
    // value = null - no data
    // value = 0    - negative
    // value > 0    - positive
    value: { type: Number },
    exists: { type: Boolean },
    // IMPORTANT
    // a data source can be mapped to targets without being
    // mapped to a unsdg.
    targets: [{
      type: {
        target: {
          type: Schema.Types.ObjectId,
          ref: 'unsdg_target',
        },
        // value = null - no data
        // value = 0    - negative
        // value > 0    - positive
        value: { type: Number },
        exists: { type: Boolean },
      },
    }],
  }],
});

export const DataSourceMappingModel = model<IDataSourceMappingDocument, Model<IDataSourceMapping>>('data_source_mapping', dataSourceMappingSchema);
