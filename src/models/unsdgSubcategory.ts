import {
  Schema,
  model,
  Document,
  Model,
} from 'mongoose';
import { IModel } from '../types/model';
import { IUnsdgCategoryDocument } from './unsdgCategory';

export interface IUnsdgSubcategory {
  name: string;
  cateogory: IUnsdgCategoryDocument['_id'];
  categoryIndex: number;
  createOn: Date;
  lastModified: Date;
}

export interface IUnsdgSubcategoryDocument extends IUnsdgSubcategory, Document {}
export type IUnsdgSubcategoryModel = IModel<IUnsdgSubcategory>;

const unsdgSubcategorySchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  category: {
    type: Schema.Types.ObjectId,
    ref: 'unsdg_category',
  },
  categoryIndex: {
    type: Number,
    required: true,
  },
  createdOn: { type: Date },
  lastModified: { type: Date },
});

export const UnsdgSubcategoryModel = model<IUnsdgSubcategoryDocument, Model<IUnsdgSubcategory>>('unsdg_subcategory', unsdgSubcategorySchema);
