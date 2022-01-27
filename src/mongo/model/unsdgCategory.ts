import {
  Schema,
  model,
  Document,
  Model,
} from 'mongoose';
import { UnsdgNames } from '../../lib/constants';
import { IModel } from '../../types/model';
import schemaDefinition from '../schema/unsdgCategory';

export interface IUnsdgCategory {
  name: UnsdgNames;
  index: number;
  createOn: Date;
  lastModified: Date;
}

export interface IUnsdgCategoryDocument extends IUnsdgCategory, Document {}
export type IUnsdgCategoryModel = IModel<IUnsdgCategory>;

export const UnsdgCategoryModel = model<IUnsdgCategoryDocument, Model<IUnsdgCategory>>('unsdg_category', new Schema(schemaDefinition));
