import {
  Schema,
  model,
  Document,
  Model,
} from 'mongoose';
import { IModel } from '../types/model';
import { IDataSourceDocument } from './dataSource';
import { IUnsdgDocument } from './unsdg';
import { IUnsdgTargetDocument } from './unsdgTarget';

export interface IUnsdgMapItem {
  unsdg: IUnsdgDocument['_id'],
  value: boolean;
  exists: boolean; // means exists or does not from the source
}

export interface IUnsdgTargetMapItem {
  unsdgTarget: IUnsdgTargetDocument['_id'];
  value: boolean;
  exists: boolean; // means exists or does not from the source
}

export interface IDataSourceUnsdgMapping {
  unsdg: IUnsdgMapItem;
  unsdgTargets: IUnsdgTargetMapItem[];
}

export interface IDataSourceMapping {
  source: IDataSourceDocument['_id'];
  unsdgs: IDataSourceUnsdgMapping;
  /**
   * the date range that we (KW) used
   * this mapping
   */
  dateRange: {
    start: Date;
    end?: Date;
  }
}

export interface IDataSourceMappingDocument extends IDataSourceMapping, Document {}
export type IDataSourceMappingModel = IModel<IDataSourceMapping>;

const dataSourceMappingSchema = new Schema({
  source: {
    type: Schema.Types.ObjectId,
    ref: 'data_source',
  },
  unsdgds: [{
    unsdg: {
      type: {
        unsdg: {
          type: Schema.Types.ObjectId,
          ref: 'unsdg',
        },
        value: { type: Boolean },
        exists: { type: Boolean },
      },
    },
    unsdgTargets: [{
      type: {
        unsdgTarget: {
          type: Schema.Types.ObjectId,
          ref: 'unsdg_target',
        },
        value: { type: Boolean },
        exists: { type: Boolean },
      },
    }],
  }],
});

export const DataSourceMappingModel = model<IDataSourceMappingDocument, Model<IDataSourceMapping>>('data_source_mapping', dataSourceMappingSchema);
