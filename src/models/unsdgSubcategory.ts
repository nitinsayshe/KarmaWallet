import {
  Schema,
  model,
  Document,
  Model,
  ObjectId,
} from 'mongoose';
import { IModel, IRef } from '../types/model';
import { IUnsdgCategoryDocument } from './unsdgCategory';

export interface IUnsdgSubcategory {
  name: string;
  category: IRef<ObjectId, IUnsdgCategoryDocument>;
  categoryIndex: number;
  createdOn: Date;
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
