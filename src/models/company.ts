import {
  Schema,
  model,
  Document,
  PaginateModel,
} from 'mongoose';
import { IModel } from '../types/model';
import { IDataSourceDocument } from './dataSource';
import { ISectorDocument } from './sector';

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
  dataSource: IDataSourceDocument['_id'];
  combinedScore: number;
  dataYear: number;
  sectors: ISectorDocument['_id'];
  slug: string;
  isBrand: boolean;
  url: string;
  grade: string;
  // eslint-disable-next-line no-use-before-define
  parentCompany: ICompanyDocument['_id'];
}

export interface ICompanyDocument extends ICompany, Document {
  _id: number;
}
export type ICompanyModel = IModel<ICompany>;

const companySchema = new Schema({
  _id: { type: Number, required: true }, // TODO: update this to ObjectId?
  companyId: { type: Number, required: true }, // ??? will this be the legacy karma id?
  companyName: { type: String, required: true },
  dataSource: {
    type: Schema.Types.ObjectId,
    ref: 'data_source',
  }, // ??? update this to ISource[]?
  combinedScore: { type: Number },
  dataYear: { type: Number }, // ??? do want to track this on the company?
  sectors: [{
    type: Schema.Types.ObjectId,
    ref: 'sector',
  }],
  slug: { type: String }, // TODO: update to virtual
  isBrand: { type: Boolean }, // ??? do we need this still?
  url: { type: String, default: null },
  grade: { type: String, default: null }, // ??? can this be computed
  parentCompany: {
    type: Schema.Types.ObjectId,
    ref: 'company',
  },
  logo: { type: String },
  relevanceScore: { type: Number, default: null },
});

export const CompanyModel = model<ICompanyDocument, PaginateModel<ICompany>>('company', companySchema);
