import {
  ObjectId,
  Schema,
  model,
  PaginateModel,
  Document,
} from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { IModel, IRef } from '../types/model';
import { IUnsdgCategory } from './unsdgCategory';

export interface IValue {
  category: IRef<ObjectId, IUnsdgCategory>;
  weight: number;
  name: string;
}

export interface IValueDocument extends IValue, Document {}
export type IValueModel = IModel<IValue>;

const valueSchema = new Schema({
  category: {
    type: Schema.Types.ObjectId,
    ref: 'unsdg_category',
    required: true,
  },
  name: {
    type: String,
    required: true,
    unique: true,
  },
  /**
   * The weight of the value to be used for sorting
   * and surfacing the most important values in
   * specific use cases (like a company's top 3 values).
   *
   * is a number between 0 and 100, where 100 is the
   * most important.
   */
  weight: {
    type: Number,
    required: true,
    default: 0,
  },
});
valueSchema.plugin(mongoosePaginate);

export const ValueModel = model<IValueDocument, PaginateModel<IValue>>('value', valueSchema);
