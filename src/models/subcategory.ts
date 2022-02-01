import {
  Schema,
  model,
  Document,
  Model,
} from 'mongoose';
import { IModel } from '../types/model';

export interface ISubcategory {
  _id: number;
  name: string;
  label: string;
  parentCategory: number;
}

export interface ISubcategoryDocument extends ISubcategory, Document {
  _id: number;
}
export type ISubcategoryModel = IModel<ISubcategory>;

const subcategorySchema = new Schema({
  _id: { type: Number, required: true },
  name: { type: String, required: true },
  label: { type: String },
  parentCategory: {
    type: Schema.Types.Number,
    ref: 'category',
    required: true,
  },
});

export const SubcategoryModel = model<ISubcategoryDocument, Model<ISubcategory>>('subcategory', subcategorySchema);
