import {
  Schema,
  model,
  Document,
  Model,
  ObjectId,
} from 'mongoose';
import { IModel, IRef } from '../types/model';
import { IUnsdgSubcategoryDocument } from './unsdgSubcategory';

export interface IUnsdg {
  title: string;
  subCategory: IRef<ObjectId, IUnsdgSubcategoryDocument>;
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

const usdgSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  subCategory: {
    type: Schema.Types.ObjectId,
    ref: 'unsdg_subcategory',
  },
  subCategoryIndex: { type: Number },
  goalNum: { type: Number },
  img: { type: String },
  sourceUrl: { type: String },
  description: { type: String },
  subTitle: { type: String },
  howToAcquire: { type: String },
  createdOn: { type: Date },
  lastModified: { type: Date },
});

export const UnsdgModel = model<IUnsdgDocument, Model<IUnsdg>>('unsdg', usdgSchema);
