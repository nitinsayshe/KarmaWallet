import {
  Schema,
  model,
  Document,
  Model,
  ObjectId,
} from 'mongoose';
import { IModel, IRef } from '../types/model';
import { IValueCategory, IValueCategoryDocument } from './valueCategory';

export interface IValueSubcategory {
  name: string;
  createdOn: Date;
  lastModified: Date;
  category: IRef<ObjectId, (IValueCategory | IValueCategoryDocument)>;
  icon?: string;
}

export interface IValueSubcategoryDocument extends IValueSubcategory, Document {}
export type IValueSubcategoryModel = IModel<IValueSubcategory>;

const valueSubcategorySchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  category: {
    type: Schema.Types.ObjectId,
    ref: 'value_category',
  },
  createdOn: { type: Date },
  lastModified: { type: Date },
  icon: {
    type: String,
  },
});

export const ValueSubcategoryModel = model<IValueSubcategoryDocument, Model<IValueSubcategory>>('value_subcategory', valueSubcategorySchema);
