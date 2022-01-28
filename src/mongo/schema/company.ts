import { Schema } from 'mongoose';

export enum CompanySource {
  JustCapital = 'justCapital',
  OneForThePlanet = '1ForThePlanet',
  BCorp = 'bCorp',
  CdpClimageChange = 'cdpClimateChange',
  CdpForests = 'cdpForests',
  CdpWaterSecurity = 'cdpWaterSecurity',
  GreenSeal = 'greenSeal',
  SaferChoice = 'saferChoice'
}

// data source should be ref
export interface ICompany {
  _id: number;
  companyId: number;
  companyName: string;
  dataSource: CompanySource;
  combinedScore: number;
  dataYear: number;
  categories: ICategoryDocument['_id'];
  hasScore: boolean;
  sucategories: ICategoryDocument['_id'];
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
  badges: IBadgeDocument['_id'];
  parentCompany: ICompanyDocument['_id'];

}

export default {
  _id: { type: Number, required: true },
  companyId: { type: Number, required: true },
  companyName: { type: String, required: true },
  dataSource: { type: String, required: true, enum: Object.values(CompanySource) },
  combinedScore: { type: Number },
  dataYear: { type: Number },
  categories: { // TODO: updating to sectors?
    type: [Schema.Types.Number],
    ref: 'category',
  },
  hasScore: { type: Boolean }, // TODO: update to virtual
  subcategories: { // TODO: updating to sectors?
    type: [Schema.Types.Number],
    ref: 'subcategory',
  },
  slug: { type: String }, // TODO: update to virtual
  isBrand: { type: Boolean },
  peopleScore: { type: Number }, // ??? can this be computed based on unsdgs?
  climateActionScore: { type: Number }, // ??? can this be computed based on unsdgs?
  sustainabilityScore: { type: Number }, // ??? can this be computed based on unsdgs?
  diversityScore: { type: Number }, // ??? can this be computed based on unsdgs?
  employeeWelfareScore: { type: Number }, // ??? can this be computed based on unsdgs?
  planetScore: { type: Number }, // ??? can this be computed based on unsdgs?
  url: { type: String, default: null },
  grade: { type: String, default: null }, // ??? can this be computed
  badges: { // ??? get rid of this?
    type: [Schema.Types.Number],
    ref: 'badge',
    default: [],
  },
  parentCompany: {
    type: Schema.Types.ObjectId,
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
    type: [Schema.Types.ObjectId],
    ref: 'company',
  },
  relevanceScore: { type: Number, default: null },
  isPartner: {
    type: Boolean,
    default: false,
  },
};
