import {
  Schema,
  model,
  Document,
  Model,
} from 'mongoose';
import { IModel, IRef } from '../types/model';
import { ISubcategory } from './subcategory';

export interface ICategory {
  _id: number;
  name: string;
  label: string;
  promote: boolean;
  hidden: boolean;
  subcategories: IRef<number, ISubcategory>
}

export interface ICategoryDocument extends ICategory, Document {
  _id: number;
}
export type ICategoryModel = IModel<ICategory>;

const categorySchema = new Schema({
  _id: { type: Number, required: true },
  name: { type: String, required: true },
  label: { type: String },
  promote: { type: Boolean, required: true },
  hidden: { type: Boolean, default: false },
  subcategories: {
    type: [Schema.Types.Number],
    ref: 'subcategory',
    default: [],
  },
});

export const CategoryModel = model<ICategoryDocument, Model<ICategory>>('category', categorySchema);
