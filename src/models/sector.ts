import { Schema, model, Document, PaginateModel } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { IModel, IRef } from '../types/model';

export interface ISectorAverageScores {
  numCompanies: number;
  avgScore: number;
  avgPlanetScore: number;
  avgPeopleScore: number;
  avgSustainabilityScore: number;
  avgClimateActionScore: number;
  avgCommunityWelfareScore: number;
  avgDiversityInclusionScore: number;
}

export interface ISector {
  name: string;
  tier: number;
  carbonMultiplier: number;
  parentSectors: IRef<Schema.Types.ObjectId, ISector>[];
  averageScores: ISectorAverageScores;
  icon: string;
  mccs: number[];
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
  icon: {
    type: String,
  },
  averageScores: {
    numCompanies: { type: Number },
    avgScore: { type: Number },
    avgPlanetScore: { type: Number },
    avgPeopleScore: { type: Number },
    avgSustainabilityScore: { type: Number },
    avgClimateActionScore: { type: Number },
    avgCommunityWelfareScore: { type: Number },
    avgDiversityInclusionScore: { type: Number },
  },
  // TODO: add validation to ensure that any sub-sectors include corresponding parent tiers
  parentSectors: [
    {
      type: Schema.Types.ObjectId,
      ref: 'sector',
    },
  ],
  mccs: [
    {
      type: Number,
    },
  ],
});
sectorSchema.plugin(mongoosePaginate);

export const SectorModel = model<ISectorDocument, PaginateModel<ISector>>('sector', sectorSchema);
