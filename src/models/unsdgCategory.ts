import {
  Schema,
  model,
  Document,
  Model,
} from 'mongoose';
import { UnsdgNames } from '../lib/constants';
import { IModel } from '../types/model';

export interface IUnsdgCategory {
  name: UnsdgNames;
  index: number;
  createdOn: Date;
  lastModified: Date;
}

export interface IUnsdgCategoryDocument extends IUnsdgCategory, Document {}
export type IUnsdgCategoryModel = IModel<IUnsdgCategory>;

const unsdgCategorySchema = new Schema({
  name: {
    type: String,
    required: true,
    enum: Object.values(UnsdgNames),
  },
  index: {
    type: Number,
    required: true,
  },
  createdOn: { type: Date },
  lastModified: { type: Date },
});

export const UnsdgCategoryModel = model<IUnsdgCategoryDocument, Model<IUnsdgCategory>>('unsdg_category', unsdgCategorySchema);
