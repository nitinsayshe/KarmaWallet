import {
  Schema,
  model,
  Document,
  Model,
} from 'mongoose';
import { IModel } from '../types/model';

export interface IPlaidCategoryMapping {
  plaidCategoriesId: string;
  plaid_categories: string[];
  carbonMultiplier: number;
  category: number;
  subCategory: number;
}

export interface IPlaidCategoryMappingDocument extends IPlaidCategoryMapping, Document {}
export type IPlaidCategoryMappingModel = IModel<IPlaidCategoryMapping>;

const plaidCategoryMappingSchema = new Schema({
  plaidCategoriesId: {
    type: String,
    unique: true,
    required: true,
  },
  plaid_categories: [{ type: String }],
  carbonMultiplier: {
    type: Number,
    required: true,
  },
  category: {
    type: Number,
  },
  subCategory: {
    type: Number,
  },
});

export const PlaidCategoryMappingModel = model<IPlaidCategoryMappingDocument, Model<IPlaidCategoryMapping>>('plaid_category_mapping', plaidCategoryMappingSchema);
