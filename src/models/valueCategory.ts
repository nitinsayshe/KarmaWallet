import {
  Schema,
  model,
  Document,
  Model,
} from 'mongoose';
import { IModel } from '../types/model';

export interface IValueCategory {
  name: string;
  index: number;
  createdOn: Date;
  lastModified: Date;
  icon?: string;
}

export interface IValueCategoryDocument extends IValueCategory, Document {}
export type IValueCategoryModel = IModel<IValueCategory>;

const valueCategorySchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  createdOn: { type: Date },
  lastModified: { type: Date },
  icon: {
    type: String,
  },
});

export const ValueCategoryModel = model<IValueCategoryDocument, Model<IValueCategory>>('value_category', valueCategorySchema);
