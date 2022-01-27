import {
  Schema,
  model,
  Document,
  Model,
} from 'mongoose';
import { IModel } from '../../types/model';
import schemaDefinition from '../schema/unsdgCategory';
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

export const UnsdgSubcategoryModel = model<IUnsdgSubcategoryDocument, Model<IUnsdgSubcategory>>('unsdg_subcategory', new Schema(schemaDefinition));
