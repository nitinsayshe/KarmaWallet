import {
  Schema,
  model,
  Document,
  Model,
} from 'mongoose';
import { IModel } from '../../types/model';
import schemaDefinition from '../schema/unsdgCategory';
import { IUnsdgSubcategoryDocument } from './unsdgSubcategory';

export interface IUnsdg {
  title: string;
  subCategory: IUnsdgSubcategoryDocument['_id'];
  subCategoryIndex: number;
  goalNum: number;
  img: string;
  sourceUrl: string;
  description: string;
  subTitle: string;
  howToAcquire: string;
  createdOn: Date;
  lastModified: Date;
}

export interface IUnsdgDocument extends IUnsdg, Document {}
export type IUnsdgModel = IModel<IUnsdg>;

export const UnsdgModel = model<IUnsdgDocument, Model<IUnsdg>>('unsdg_category', new Schema(schemaDefinition));
