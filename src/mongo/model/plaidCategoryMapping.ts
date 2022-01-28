import {
  Schema,
  model,
  Document,
  Model,
} from 'mongoose';
import { IModel } from '../../types/model';
import schemaDefinition from '../schema/plaidCategoryMapping';

export interface IPlaidCategoryMapping {
  plaidCategoriesId: string;
  plaid_categories: string[];
  carbonMultiplier: number;
  category: number;
  subCategory: number;
}

export interface IPlaidCategoryMappingDocument extends IPlaidCategoryMapping, Document {}
export type IPlaidCategoryMappingModel = IModel<IPlaidCategoryMapping>;

export const PlaidCategoryMappingModel = model<IPlaidCategoryMappingDocument, Model<IPlaidCategoryMapping>>('plaid_category_mapping', new Schema(schemaDefinition));
