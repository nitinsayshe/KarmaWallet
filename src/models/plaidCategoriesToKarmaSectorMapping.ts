import {
  Schema,
  model,
  Document,
  Model,
} from 'mongoose';
import { IModel, IRef } from '../types/model';
import { ISector } from './sector';

// TODO: delete this model once company sectors are implemented

export interface IPlaidCategoriesToSectorMapping {
  plaidCategoriesId: string;
  plaidCategories: string[];
  sector: IRef<Schema.Types.ObjectId, ISector>;
}

export interface IPlaidCategoriesToSectorMappingDocument extends IPlaidCategoriesToSectorMapping, Document {}
export type IPlaidCategoriesToSectorMappingModel = IModel<IPlaidCategoriesToSectorMapping>;

const plaidCategoriesToSectorMappingSchema = new Schema({
  plaidCategoriesId: {
    type: String,
    unique: true,
    required: true,
  },
  plaidCategories: [{ type: String }],
  sector: {
    type: Schema.Types.ObjectId,
    ref: 'sector',
    required: true,
  },
});

export const PlaidCategoriesToSectorMappingModel = model<IPlaidCategoriesToSectorMappingDocument, Model<IPlaidCategoriesToSectorMapping>>('plaid_categories_to_sector_mapping', plaidCategoriesToSectorMappingSchema);
