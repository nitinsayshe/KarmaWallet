import {
  ObjectId,
  Schema,
  model,
  PaginateModel,
  Document,
} from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { IModel, IRef } from '../types/model';
import { IDataSource } from './dataSource';
import { IValue } from './value';

export interface IValueDataSourceMapping {
  value: IRef<ObjectId, IValue>;
  dataSource: IRef<ObjectId, IDataSource>;
}

export interface IValueDataSourceMappingDocument extends IValueDataSourceMapping, Document {}
export type IValueDataSourceMappingModel = IModel<IValueDataSourceMapping>;

const valueDataSourceMappingSchema = new Schema({
  dataSource: {
    type: Schema.Types.ObjectId,
    ref: 'data_source',
    required: true,
  },
  value: {
    type: Schema.Types.ObjectId,
    ref: 'value',
    required: true,
  },
});
valueDataSourceMappingSchema.plugin(mongoosePaginate);

export const ValueDataSourceMappingModel = model<IValueDataSourceMappingDocument, PaginateModel<IValueDataSourceMapping>>('value_data_source_mapping', valueDataSourceMappingSchema);
