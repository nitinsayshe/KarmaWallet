import {
  Schema,
  model,
  Document,
  PaginateModel,
} from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { IModel } from '../types/model';

export interface IBadgeCounts {
  people: number;
  planet: number;
}

interface ILogos {
  source: string;
  ritekit: string;
  original: string;
  clearbit: string;
}

export interface ILegacyCompany {
  _id: number;
  companyName: string;
  dataSource: 'justCapital' | '1ForThePlanet' | 'bCorp' | 'cdpClimateChange' | 'cdpForests' | 'cdpWaterSecurity' | 'greenSeal' | 'saferChoice';
  combinedScore: number;
  dataYear: never;
  categories: number[];
  hasScore: boolean;
  subCategories: number[];
  slug: string;
  isBrand: boolean;
  peopleScore: number;
  climateActionScore: number;
  sustainabilityScore: number;
  diversityScore: number;
  employeeWelfareScore: number;
  planetScore: number;
  url: string;
  grade: string;
  badges: number[];
  unSdg1: boolean;
  unSdg2: boolean;
  unSdg3: boolean;
  unSdg4: boolean;
  unSdg5: boolean;
  unSdg6: boolean;
  unSdg7: boolean;
  unSdg8: boolean;
  unSdg9: boolean;
  unSdg10: boolean;
  unSdg11: boolean;
  unSdg12: boolean;
  unSdg13: boolean;
  unSdg14: boolean;
  unSdg15: boolean;
  unSdg16: boolean;
  unSdg17: boolean;
  parentCompany: number;
  saferChoice: boolean;
  cdpForests: boolean;
  cdpWaterSecurity: boolean;
  cdpClimateChange: boolean;
  greenSeal: boolean;
  onePercentForThePlanet: boolean;
  badgeCounts: IBadgeCounts;
  logo: string;
  logos: ILogos;
  brands: number[];
  relevanceScore: number;
  isPartner: boolean;
}

export interface ILegacyCompanyDocument extends ILegacyCompany, Document {
  _id: number;
}
export type ILegacyCompanyModel = IModel<ILegacyCompany>;

const legacyCompanySchema = new Schema({
  _id: { type: Number, required: true },
  companyId: { type: Number, required: true },
  companyName: { type: String, required: true },
  dataSource: { type: String, required: true, enum: ['justCapital', '1ForThePlanet', 'bCorp', 'cdpClimateChange', 'cdpForests', 'cdpWaterSecurity', 'greenSeal', 'saferChoice'] },
  combinedScore: { type: Number },
  dataYear: { type: Number },
  categories: {
    type: [Schema.Types.Number],
    ref: 'category',
  },
  hasScore: { type: Boolean },
  subcategories: {
    type: [Schema.Types.Number],
    ref: 'subcategory',
  },
  slug: { type: String },
  isBrand: { type: Boolean },
  peopleScore: { type: Number },
  climateActionScore: { type: Number },
  sustainabilityScore: { type: Number },
  diversityScore: { type: Number },
  employeeWelfareScore: { type: Number },
  planetScore: { type: Number },
  url: { type: String, default: null },
  grade: { type: String, default: null },
  badges: {
    type: [Schema.Types.Number],
    ref: 'badge',
    default: [],
  },
  unSdg1: { type: Boolean, default: null },
  unSdg2: { type: Boolean, default: null },
  unSdg3: { type: Boolean, default: null },
  unSdg4: { type: Boolean, default: null },
  unSdg5: { type: Boolean, default: null },
  unSdg6: { type: Boolean, default: null },
  unSdg7: { type: Boolean, default: null },
  unSdg8: { type: Boolean, default: null },
  unSdg9: { type: Boolean, default: null },
  unSdg10: { type: Boolean, default: null },
  unSdg11: { type: Boolean, default: null },
  unSdg12: { type: Boolean, default: null },
  unSdg13: { type: Boolean, default: null },
  unSdg14: { type: Boolean, default: null },
  unSdg15: { type: Boolean, default: null },
  unSdg16: { type: Boolean, default: null },
  unSdg17: { type: Boolean, default: null },
  parentCompany: {
    type: Schema.Types.Number,
    ref: 'company',
  },
  saferChoice: { type: Boolean, default: null },
  cdpForests: { type: Boolean, default: null },
  cdpWaterSecurity: { type: Boolean, default: null },
  cdpClimateChange: { type: Boolean, default: null },
  greenSeal: { type: Boolean, default: null },
  onePercentForThePlanet: { type: Boolean, default: null },
  badgeCounts: {
    people: { type: Number },
    planet: { type: Number },
  },
  logo: { type: String },
  logos: {
    type: Object,
    default: {
      source: { type: String, default: null },
      clearbit: { type: String, default: null },
      ritekit: { type: String, default: null },
      original: { type: String, default: null },
    },
  },
  brands: {
    type: [Schema.Types.Number],
    ref: 'company',
  },
  relevanceScore: { type: Number, default: null },
  isPartner: {
    type: Boolean,
    default: false,
  },
});
legacyCompanySchema.plugin(mongoosePaginate);

export const LegacyCompanyModel = model<ILegacyCompanyDocument, PaginateModel<ILegacyCompany>>('legacy_company', legacyCompanySchema);
export const LegacyHiddenCompanyModel = model<ILegacyCompanyDocument, PaginateModel<ILegacyCompany>>('hidden_company', legacyCompanySchema);
