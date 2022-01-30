import {
  Schema,
  model,
  Document,
  Model,
} from 'mongoose';
import { IModel } from '../types/model';

export interface ISector {
  name: string;
  tier: number;
  carbonMultiplier: number;
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
});

export const SectorModel = model<ISectorDocument, Model<ISector>>('sector', sectorSchema);
