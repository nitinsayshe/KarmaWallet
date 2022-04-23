import {
  Schema,
  model,
  Document,
  PaginateModel,
} from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { IModel, IRef } from '../types/model';

export interface ISector {
  name: string;
  tier: number;
  carbonMultiplier: number;
  parentSectors: IRef<Schema.Types.ObjectId, ISector>[];
}

export interface ISectorDocument extends ISector, Document {}
export type ISectorModel = IModel<ISector>;

const sectorSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  tier: {
    type: Number,
    required: true,
  },
  carbonMultiplier: {
    type: Number,
  },
  // TODO: add validation to ensure that any sub-sectors include corresponding parent tiers
  parentSectors: [{
    type: Schema.Types.ObjectId,
    ref: 'sector',
  }],
});
sectorSchema.plugin(mongoosePaginate);

export const SectorModel = model<ISectorDocument, PaginateModel<ISector>>('sector', sectorSchema);
